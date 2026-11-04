const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { paginar } = require('../utils/paginacion');
const { Actividad, Inscripcion, Asistencia } = require('../models');
const permisos = require('./permisos');
const notificaciones = require('./notificacion.service');
const { Usuario } = require('../models');
const dto = require('./dto');

/** Reserva atómica del cupo (2.2): evita que dos personas tomen el último lugar. */
async function reservarCupo(actividadId) {
  const act = await Actividad.findOneAndUpdate(
    { _id: actividadId, estado: 'publicada', $expr: { $lt: ['$inscriptos', '$cupo'] } },
    { $inc: { inscriptos: 1 } },
    { returnDocument: 'after' }
  );
  if (!act) throw ApiError.conflict('CUPO_LLENO', 'No quedan cupos');
  return act;
}

async function liberarCupo(actividadId) {
  await Actividad.updateOne({ _id: actividadId, inscriptos: { $gt: 0 } }, { $inc: { inscriptos: -1 } });
}

async function notificarCoordinadores(organizacionId, titulo, cuerpo, data) {
  const coords = await Usuario.find({ rol: 'coordinador', organizacionId, activo: true }).distinct('_id');
  if (coords.length) notificaciones.notificar(coords, titulo, cuerpo, data);
}

/** POST /actividades/:id/inscripciones — voluntario + ABAC + cupo. */
async function inscribir(usuario, actividadId, ctx) {
  const act = await Actividad.findById(actividadId).lean();
  if (!act || act.estado !== 'publicada') throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  if (new Date(act.fechaFin) < new Date()) throw ApiError.conflict('ACTIVIDAD_FINALIZADA', 'La actividad ya terminó');

  await permisos.assertABAC(usuario, act, ctx); // un judicial no puede inscribirse a una actividad sensible

  const previa = await Inscripcion.findOne({ actividadId, voluntarioId: usuario.id });
  if (previa && ['pendiente', 'aceptada'].includes(previa.estado)) throw ApiError.conflict('YA_INSCRIPTO', 'Ya estás inscripto en esta actividad');
  if (previa && previa.estado === 'rechazada') throw ApiError.conflict('INSCRIPCION_RECHAZADA', 'Tu inscripción a esta actividad fue rechazada');

  await reservarCupo(actividadId);

  let inscripcion;
  try {
    if (previa) {
      // Había cancelado antes: se reactiva la misma inscripción. Es atómico (solo si SIGUE cancelada):
      // con dos pedidos simultáneos, uno solo la reactiva y el otro devuelve su cupo (RS-18).
      inscripcion = await Inscripcion.findOneAndUpdate(
        { _id: previa._id, estado: 'cancelada' },
        { $set: { estado: 'pendiente', fecha: new Date() } },
        { returnDocument: 'after' }
      );
      if (!inscripcion) throw ApiError.conflict('YA_INSCRIPTO', 'Ya estás inscripto en esta actividad');
    } else {
      inscripcion = await Inscripcion.create({ actividadId, voluntarioId: usuario.id, organizacionId: act.organizacionId });
    }
  } catch (err) {
    await liberarCupo(actividadId); // si falla (por ejemplo, doble pedido simultáneo) devolvemos el cupo
    if (err instanceof ApiError) throw err;
    if (err.code === 11000) throw ApiError.conflict('YA_INSCRIPTO', 'Ya estás inscripto en esta actividad');
    throw err;
  }

  await auditoria.registrar({ usuarioId: usuario.id, accion: 'inscripcion_crear', recurso: 'inscripcion', recursoId: inscripcion._id, resultado: 'ok', ip: ctx.ip });
  notificarCoordinadores(act.organizacionId, 'Nueva inscripción', `Hay una nueva inscripción en "${act.titulo}"`, { actividadId: String(act._id) });
  return { id: String(inscripcion._id), actividadId: String(actividadId), estado: inscripcion.estado };
}

/** GET /usuarios/me/inscripciones — el id sale del token (RS2). */
async function misInscripciones(usuario, q) {
  const filtro = { voluntarioId: usuario.id };
  if (q.estado) filtro.estado = q.estado;
  const res = await paginar(
    Inscripcion.find(filtro).sort({ fecha: -1 }).populate({ path: 'actividadId', select: 'titulo fechaInicio fechaFin direccion estado' }).lean(),
    Inscripcion.countDocuments(filtro),
    q
  );
  return { ...res, data: res.data.map(dto.inscripcionPropia) };
}

/** DELETE /inscripciones/:id — solo el titular (RS2, A1). */
async function cancelar(usuario, id, ctx) {
  const ins = await Inscripcion.findById(id);
  if (!ins) throw ApiError.notFound('INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');
  permisos.assertTitular(usuario, ins.voluntarioId, { recurso: 'inscripcion', recursoId: id, ip: ctx.ip });

  if (!['pendiente', 'aceptada'].includes(ins.estado)) throw ApiError.conflict('NO_CANCELABLE', 'La inscripción no se puede cancelar');
  if (await Asistencia.exists({ inscripcionId: ins._id })) throw ApiError.conflict('ASISTENCIA_REGISTRADA', 'Ya tenés una asistencia registrada en esta actividad');

  // RS-18: el cambio de estado es atómico y el cupo se libera SOLO si este pedido fue el que cambió
  // el estado. Si llegan dos "cancelar" a la vez, el segundo no encuentra nada que cancelar.
  const cancelada = await Inscripcion.findOneAndUpdate(
    { _id: ins._id, estado: { $in: ['pendiente', 'aceptada'] } },
    { $set: { estado: 'cancelada' } },
    { returnDocument: 'after' }
  );
  if (!cancelada) throw ApiError.conflict('NO_CANCELABLE', 'La inscripción no se puede cancelar');
  await liberarCupo(ins.actividadId);
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'inscripcion_cancelar', recurso: 'inscripcion', recursoId: ins._id, resultado: 'ok', ip: ctx.ip });
}

/** GET /actividades/:id/inscripciones — coordinador de la org (RS3). Devuelve contacto (RS6 lo permite). */
async function listarPorActividad(usuario, actividadId, q, ctx) {
  const act = await Actividad.findById(actividadId).lean();
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  permisos.assertMismaOrganizacion(usuario, act, { recurso: 'actividad', ip: ctx.ip });

  const filtro = { actividadId };
  if (q.estado) filtro.estado = q.estado;
  const lista = await Inscripcion.find(filtro)
    .sort({ fecha: 1 })
    .populate({ path: 'voluntarioId', select: 'nombre apellido telefono esJudicial' })
    .lean();
  return lista.map(dto.inscripcionParaCoordinador);
}

/* PATCH /inscripciones/:id — aceptar o rechazar (R4). Coordinador de la org (RS3).
 Transiciones válidas: pendiente -> aceptada | rechazada ; aceptada -> rechazada (si no tiene asistencia).
 */
async function cambiarEstado(usuario, id, nuevoEstado, ctx) {
  const ins = await Inscripcion.findById(id);
  if (!ins) throw ApiError.notFound('INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');
  permisos.assertMismaOrganizacion(usuario, ins, { recurso: 'inscripcion', ip: ctx.ip });

  const validas = { pendiente: ['aceptada', 'rechazada'], aceptada: ['rechazada'] };
  if (!(validas[ins.estado] || []).includes(nuevoEstado)) {
    throw ApiError.conflict('TRANSICION_INVALIDA', `No se puede pasar de ${ins.estado} a ${nuevoEstado}`);
  }
  if (nuevoEstado === 'rechazada' && (await Asistencia.exists({ inscripcionId: ins._id }))) {
    throw ApiError.conflict('ASISTENCIA_REGISTRADA', 'La persona ya tiene una asistencia registrada');
  }

  // Cambio condicionado al estado anterior: si otro coordinador lo cambió al mismo tiempo, no se pisa.
  const actualizada = await Inscripcion.findOneAndUpdate({ _id: ins._id, estado: ins.estado }, { $set: { estado: nuevoEstado } }, { returnDocument: 'after' });
  if (!actualizada) throw ApiError.conflict('TRANSICION_INVALIDA', 'La inscripción cambió mientras la editabas; recargá');
  if (nuevoEstado === 'rechazada') await liberarCupo(ins.actividadId);

  await auditoria.registrar({ usuarioId: usuario.id, accion: `inscripcion_${nuevoEstado}`, recurso: 'inscripcion', recursoId: ins._id, resultado: 'ok', ip: ctx.ip });
  const act = await Actividad.findById(ins.actividadId).select('titulo').lean();
  notificaciones.notificar(ins.voluntarioId, 'Tu inscripción cambió', `Tu inscripción a "${act ? act.titulo : 'la actividad'}" fue ${nuevoEstado}`, { inscripcionId: String(ins._id) });

  return { id: String(actualizada._id), actividadId: String(actualizada.actividadId), estado: actualizada.estado };
}

/*Datos para el certificado. Acceso: titular (RS2) o coordinador de la org (RS3).
 Requiere al menos una asistencia validada.
 */
async function datosCertificado(usuario, id, ctx) {
  const ins = await Inscripcion.findById(id)
    .populate({ path: 'actividadId', select: 'titulo fechaInicio fechaFin direccion' })
    .populate({ path: 'voluntarioId', select: 'nombre apellido' })
    .populate({ path: 'organizacionId', select: 'nombre' })
    .lean();
  if (!ins) throw ApiError.notFound('INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');

  if (usuario.rol === 'voluntario') {
    permisos.assertTitular(usuario, ins.voluntarioId._id, { recurso: 'certificado', recursoId: id, ip: ctx.ip });
  } else {
    permisos.assertMismaOrganizacion(usuario, { _id: ins._id, organizacionId: ins.organizacionId._id }, { recurso: 'certificado', ip: ctx.ip });
  }

  const asistencias = await Asistencia.find({ inscripcionId: ins._id, estado: 'validada' }).lean();
  if (asistencias.length === 0) throw ApiError.conflict('SIN_ASISTENCIA_VALIDADA', 'Todavía no hay una asistencia validada para esta inscripción');
  const horas = Math.round(asistencias.reduce((t, a) => t + a.horas, 0) * 100) / 100;

  await auditoria.registrar({ usuarioId: usuario.id, accion: 'certificado_descarga', recurso: 'inscripcion', recursoId: ins._id, resultado: 'ok', ip: ctx.ip });
  return {
    codigo: String(ins._id),
    voluntario: `${ins.voluntarioId.nombre} ${ins.voluntarioId.apellido}`,
    organizacion: ins.organizacionId.nombre,
    actividad: ins.actividadId.titulo,
    fecha: ins.actividadId.fechaInicio,
    direccion: ins.actividadId.direccion || '',
    horas,
  };
}

module.exports = { inscribir, misInscripciones, cancelar, listarPorActividad, cambiarEstado, datosCertificado, liberarCupo };
