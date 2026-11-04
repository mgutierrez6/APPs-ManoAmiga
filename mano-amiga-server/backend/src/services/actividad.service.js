const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { paginar } = require('../utils/paginacion');
const config = require('../config/env');
const logger = require('../utils/logger');
const { Actividad, Etiqueta, Usuario } = require('../models');
const permisos = require('./permisos');
const notificaciones = require('./notificacion.service');
const dto = require('./dto');

const RADIO_TIERRA_KM = 6378.1;
const POBLAR = [
  { path: 'etiquetas', select: 'nombre' },
  { path: 'organizacionId', select: 'nombre' },
];

const aPunto = ({ lat, lng }) => ({ type: 'Point', coordinates: [lng, lat] });

async function validarEtiquetas(ids) {
  if (!ids || ids.length === 0) return;
  const existentes = await Etiqueta.countDocuments({ _id: { $in: ids } });
  if (existentes !== ids.length) throw ApiError.badRequest('ETIQUETA_INEXISTENTE', 'Alguna etiqueta no existe');
}

/* Listado con filtro ABAC DENTRO de la consulta (5.3): las actividades sensibles nunca salen del servidor
 para un voluntario judicial.
 */
async function listar(usuario, q) {
  const condiciones = [];

  if (q.mias) {
    // Coordinador: todas las actividades de SU organización (también canceladas o finalizadas).
    if (usuario.rol !== 'coordinador') throw ApiError.forbidden('ROL_NO_PERMITIDO', 'Solo los coordinadores pueden ver las actividades de su organización');
    condiciones.push({ organizacionId: usuario.organizacionId });
  } else {
    condiciones.push({ estado: 'publicada', fechaFin: { $gte: new Date() } });
  }

  if (q.etiqueta) condiciones.push({ etiquetas: q.etiqueta });

  if (usuario.esJudicial) {
    const sensibles = await permisos.idsEtiquetasSensibles();
    condiciones.push({ etiquetas: { $nin: sensibles } });
  }

  if (q.lat !== undefined && q.lng !== undefined) {
    condiciones.push({
      ubicacion: { $geoWithin: { $centerSphere: [[q.lng, q.lat], q.radio / RADIO_TIERRA_KM] } },
    });
  }

  const filtro = { $and: condiciones };
  const res = await paginar(
    Actividad.find(filtro).sort({ fechaInicio: 1 }).populate(POBLAR).lean(),
    Actividad.countDocuments(filtro),
    q
  );
  return { ...res, data: res.data.map(dto.actividad) };
}

async function obtener(usuario, id, ctx) {
  const act = await Actividad.findById(id).populate(POBLAR).lean();
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');

  const esDeSuOrg = usuario.rol === 'coordinador' && String(act.organizacionId._id) === usuario.organizacionId;
  if (act.estado !== 'publicada' && !esDeSuOrg) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');

  await permisos.assertABAC(usuario, act, ctx);
  return dto.actividad(act);
}

async function crear(usuario, datos, ctx) {
  await validarEtiquetas(datos.etiquetas);
  const act = await Actividad.create({
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    etiquetas: datos.etiquetas,
    ubicacion: aPunto(datos.ubicacion),
    direccion: datos.direccion,
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    cupo: datos.cupo,
    organizacionId: usuario.organizacionId, // del token, nunca del body
    creadaPor: usuario.id,
  });
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'actividad_crear', recurso: 'actividad', recursoId: act._id, resultado: 'ok', ip: ctx.ip });
  avisarNuevaActividad(act); // sin await: el push no debe demorar la respuesta
  return obtener(usuario, act._id, ctx);
}

/**
 * R9 · Aviso de nueva actividad a los voluntarios con notificaciones activadas.
 * ABAC también acá: si la actividad es sensible, a un voluntario judicial NO se le avisa.
 */
async function avisarNuevaActividad(act) {
  if (config.esTest) return; // en los tests no hay push (y así no quedan consultas sueltas)
  try {
    const filtro = { rol: 'voluntario', activo: true, 'pushTokens.0': { $exists: true } };
    const sensibles = (await permisos.idsEtiquetasSensibles()).map(String);
    if ((act.etiquetas || []).some((e) => sensibles.includes(String(e)))) filtro.esJudicial = false;
    const destinatarios = await Usuario.find(filtro).distinct('_id');
    if (destinatarios.length) {
      await notificaciones.notificar(destinatarios, 'Nueva actividad', `Se publicó "${act.titulo}". ¡Sumate!`, { actividadId: String(act._id) });
    }
  } catch (err) {
    logger.warn('No se pudo avisar la nueva actividad', err.message);
  }
}

async function actualizar(usuario, id, datos, ctx) {
  const act = await Actividad.findById(id);
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  permisos.assertMismaOrganizacion(usuario, act, { recurso: 'actividad', ip: ctx.ip }); // RS3
  if (act.estado !== 'publicada') throw ApiError.conflict('ACTIVIDAD_NO_EDITABLE', 'Solo se pueden editar actividades publicadas');

  if (datos.etiquetas) await validarEtiquetas(datos.etiquetas);
  const inicio = datos.fechaInicio || act.fechaInicio;
  const fin = datos.fechaFin || act.fechaFin;
  if (new Date(fin) <= new Date(inicio)) throw ApiError.badRequest('FECHAS_INVALIDAS', 'La fecha de fin debe ser posterior a la de inicio');
  if (datos.cupo !== undefined && datos.cupo < act.inscriptos) {
    throw ApiError.conflict('CUPO_MENOR_A_INSCRIPTOS', `Ya hay ${act.inscriptos} inscriptos; el cupo no puede ser menor`);
  }

  // Lista blanca explícita de campos editables (mass assignment).
  for (const campo of ['titulo', 'descripcion', 'etiquetas', 'direccion', 'fechaInicio', 'fechaFin', 'cupo']) {
    if (datos[campo] !== undefined) act[campo] = datos[campo];
  }
  if (datos.ubicacion) act.ubicacion = aPunto(datos.ubicacion);
  await act.save();

  await auditoria.registrar({ usuarioId: usuario.id, accion: 'actividad_editar', recurso: 'actividad', recursoId: act._id, resultado: 'ok', ip: ctx.ip });
  return obtener(usuario, act._id, ctx);
}

/** "Eliminar" = cancelar: se conserva la actividad para no perder el historial de asistencias y horas. */
async function eliminar(usuario, id, ctx) {
  const act = await Actividad.findById(id);
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  permisos.assertMismaOrganizacion(usuario, act, { recurso: 'actividad', ip: ctx.ip }); // RS3
  act.estado = 'cancelada';
  await act.save();
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'actividad_cancelar', recurso: 'actividad', recursoId: act._id, resultado: 'ok', ip: ctx.ip });
}

async function listarEtiquetas() {
  const etiquetas = await Etiqueta.find().sort({ nombre: 1 }).lean();
  return etiquetas.map(dto.etiqueta);
}

module.exports = { listar, obtener, crear, actualizar, eliminar, listarEtiquetas };
