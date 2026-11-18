const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { Actividad, Inscripcion, Mensaje, Usuario } = require('../models');
const permisos = require('./permisos');
const avisos = require('./notificacion.service');

/*
 Chat de la actividad.

 Quién entra (se controla acá, en la API, no en la app):
  - el voluntario con inscripción ACEPTADA en esa actividad (y que pase ABAC),
  - los coordinadores de la organización dueña (RS3).
 Cualquier otra persona recibe 403, aunque conozca el id de la actividad.

 Solo lectura: si la actividad se canceló o terminó hace más de 7 días.
 Moderación: el coordinador puede borrar cualquier mensaje; cada uno puede borrar los suyos.
 La app consulta mensajes nuevos cada ~5 s con ?despues=<fecha del último>.
 */
const DIAS_ABIERTO = 7;
const MAX_POR_MINUTO = 20;
const MAX_LISTA = 100;

function motivoSoloLectura(act) {
  if (act.estado === 'cancelada') return 'La actividad se canceló: el chat quedó solo para leer.';
  if (new Date(act.fechaFin).getTime() + DIAS_ABIERTO * 24 * 3600 * 1000 < Date.now()) return 'La actividad terminó: el chat quedó solo para leer.';
  return null;
}

/** Devuelve la actividad si el usuario puede entrar al chat; si no, 403 (y queda en la auditoría). */
async function assertParticipante(usuario, actividadId, ctx) {
  const act = await Actividad.findById(actividadId).lean();
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');

  if (usuario.rol === 'coordinador') {
    permisos.assertMismaOrganizacion(usuario, act, { recurso: 'chat', ip: ctx.ip }); // RS3
    return act;
  }
  await permisos.assertABAC(usuario, act, ctx);
  const aceptada = await Inscripcion.exists({ actividadId, voluntarioId: usuario.id, estado: 'aceptada' });
  if (!aceptada) {
    await auditoria.registrar({ usuarioId: usuario.id, accion: 'acceso_denegado_chat', recurso: 'chat', recursoId: act._id, resultado: 'denegado', ip: ctx.ip });
    throw ApiError.forbidden('NO_PARTICIPA', 'El chat es solo para inscriptos aceptados y coordinadores');
  }
  return act;
}

/** Todas las personas del chat: aceptados + coordinadores activos de la organización. */
async function participantes(act) {
  const [vols, coords] = await Promise.all([
    Inscripcion.find({ actividadId: act._id, estado: 'aceptada' }).distinct('voluntarioId'),
    Usuario.find({ rol: 'coordinador', organizacionId: act.organizacionId, activo: true }).distinct('_id'),
  ]);
  return [...vols, ...coords].map(String);
}

function dtoMensaje(m, usuario) {
  const autor = m.autorId || {};
  return {
    id: String(m._id),
    texto: m.borrado ? null : m.texto,
    borrado: Boolean(m.borrado),
    fecha: m.fecha,
    autor: { nombre: autor.nombre || 'Alguien', esCoordinador: autor.rol === 'coordinador' },
    mio: String(autor._id || m.autorId) === usuario.id,
    puedoBorrar: !m.borrado && (usuario.rol === 'coordinador' || String(autor._id || m.autorId) === usuario.id),
  };
}

/** GET /actividades/:id/mensajes?despues=<fecha> */
async function listar(usuario, actividadId, q, ctx) {
  const act = await assertParticipante(usuario, actividadId, ctx);
  const filtro = { actividadId };
  let lista;
  if (q.despues) {
    filtro.fecha = { $gt: q.despues };
    lista = await Mensaje.find(filtro).sort({ fecha: 1 }).limit(MAX_LISTA).populate({ path: 'autorId', select: 'nombre rol' }).lean();
  } else {
    // Primera carga: los últimos 100, en orden de más viejo a más nuevo.
    lista = (await Mensaje.find(filtro).sort({ fecha: -1 }).limit(MAX_LISTA).populate({ path: 'autorId', select: 'nombre rol' }).lean()).reverse();
  }
  await avisos.leerChat(usuario.id, act._id);
  const motivo = motivoSoloLectura(act);
  return { data: lista.map((m) => dtoMensaje(m, usuario)), puedeEscribir: !motivo, soloLectura: motivo };
}

/** POST /actividades/:id/mensajes */
async function enviar(usuario, actividadId, { texto }, ctx) {
  const act = await assertParticipante(usuario, actividadId, ctx);
  const motivo = motivoSoloLectura(act);
  if (motivo) throw ApiError.conflict('CHAT_CERRADO', motivo);

  const recientes = await Mensaje.countDocuments({ autorId: usuario.id, fecha: { $gte: new Date(Date.now() - 60 * 1000) } });
  if (recientes >= MAX_POR_MINUTO) throw new ApiError(429, 'DEMASIADOS_MENSAJES', 'Mandaste muchos mensajes seguidos. Esperá un momento.');

  const m = await Mensaje.create({ actividadId, organizacionId: act.organizacionId, autorId: usuario.id, texto });
  const otros = (await participantes(act)).filter((id) => id !== usuario.id);
  await avisos.avisarChat(otros, act);

  const conAutor = await Mensaje.findById(m._id).populate({ path: 'autorId', select: 'nombre rol' }).lean();
  return dtoMensaje(conAutor, usuario);
}

/** DELETE /mensajes/:id — el autor, o un coordinador de la organización (moderación). */
async function borrar(usuario, id, ctx) {
  const m = await Mensaje.findById(id);
  if (!m) throw ApiError.notFound('MENSAJE_NO_ENCONTRADO', 'El mensaje no existe');
  if (usuario.rol === 'coordinador') {
    permisos.assertMismaOrganizacion(usuario, m, { recurso: 'mensaje', ip: ctx.ip });
  } else {
    permisos.assertTitular(usuario, m.autorId, { recurso: 'mensaje', recursoId: id, ip: ctx.ip });
  }
  if (!m.borrado) {
    m.borrado = true;
    m.borradoPor = usuario.id;
    await m.save();
    await auditoria.registrar({ usuarioId: usuario.id, accion: 'mensaje_borrar', recurso: 'mensaje', recursoId: m._id, resultado: 'ok', ip: ctx.ip });
  }
}

module.exports = { listar, enviar, borrar, participantes };
