const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { Actividad, Inscripcion, Asistencia, Usuario } = require('../models');
const permisos = require('./permisos');
const qr = require('./qr.service');
const notificaciones = require('./notificacion.service');
const dto = require('./dto');

// Ventana en la que se puede generar/escanear el QR: desde 2 h antes del inicio hasta 2 h después del fin.
const MARGEN_MS = 2 * 60 * 60 * 1000;
const redondear = (n) => Math.round(n * 100) / 100;

/* RS-20: No se acreditan horas de una actividad cancelada ni de una que todavía no empezó
 (las horas judiciales tienen que corresponder a trabajo que realmente ocurrió).
 */
function assertSePuedenAcreditarHoras(act) {
  if (!act || act.estado === 'cancelada') throw ApiError.conflict('ACTIVIDAD_CANCELADA', 'La actividad fue cancelada: no se pueden acreditar horas');
  if (Date.now() < new Date(act.fechaInicio).getTime()) throw ApiError.conflict('ACTIVIDAD_NO_EMPEZO', 'La actividad todavía no empezó: no se pueden acreditar horas');
}

async function actividadDeMiOrg(usuario, actividadId, ctx) {
  const act = await Actividad.findById(actividadId).lean();
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  permisos.assertMismaOrganizacion(usuario, act, { recurso: 'actividad', ip: ctx.ip }); // RS3
  return act;
}

function assertEnHorario(act) {
  const ahora = Date.now();
  if (ahora < new Date(act.fechaInicio).getTime() - MARGEN_MS || ahora > new Date(act.fechaFin).getTime() + MARGEN_MS) {
    throw ApiError.conflict('FUERA_DE_HORARIO', 'El registro de asistencia solo está disponible cerca del horario de la actividad');
  }
}

/** GET /actividades/:id/qr — coordinador de la org. La app lo renueva cada ~50 s. */
async function generarQR(usuario, actividadId, ctx) {
  const act = await actividadDeMiOrg(usuario, actividadId, ctx);
  if (act.estado !== 'publicada') throw ApiError.conflict('ACTIVIDAD_NO_ACTIVA', 'La actividad no está activa');
  assertEnHorario(act);
  return qr.generar(act._id);
}

/** POST /actividades/:id/asistencias — el voluntario escanea el QR (check-in). */
async function registrarConQR(usuario, actividadId, codigo, ctx) {
  qr.verificar(codigo, actividadId); // firma + vencimiento + actividad correcta

  const act = await Actividad.findById(actividadId).lean();
  if (!act || act.estado !== 'publicada') throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  assertEnHorario(act);
  // RS-19: la regla ABAC se vuelve a controlar acá (la persona pudo pasar a ser judicial después de inscribirse).
  await permisos.assertABAC(usuario, act, ctx);

  const ins = await Inscripcion.findOne({ actividadId, voluntarioId: usuario.id }).lean();
  if (!ins || ins.estado !== 'aceptada') throw ApiError.forbidden('INSCRIPCION_NO_ACEPTADA', 'Solo pueden registrar asistencia las personas aceptadas');

  try {
    const asis = await Asistencia.create({
      inscripcionId: ins._id,
      actividadId,
      voluntarioId: usuario.id,
      organizacionId: act.organizacionId,
      checkIn: new Date(),
      metodo: 'qr',
    });
    await auditoria.registrar({ usuarioId: usuario.id, accion: 'asistencia_checkin', recurso: 'asistencia', recursoId: asis._id, resultado: 'ok', ip: ctx.ip });
    return dto.asistencia(asis);
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('ASISTENCIA_YA_REGISTRADA', 'Ya registraste tu asistencia en esta actividad');
    throw err;
  }
}

/** POST /inscripciones/:id/asistencia-manual — el coordinador registra y valida sin QR (R4: "QR o manual"). */
async function registrarManual(usuario, inscripcionId, horasPedidas, ctx) {
  const ins = await Inscripcion.findById(inscripcionId).lean();
  if (!ins) throw ApiError.notFound('INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');
  permisos.assertMismaOrganizacion(usuario, ins, { recurso: 'inscripcion', ip: ctx.ip }); // RS3
  if (ins.estado !== 'aceptada') throw ApiError.conflict('INSCRIPCION_NO_ACEPTADA', 'La inscripción no está aceptada');

  const act = await Actividad.findById(ins.actividadId).lean();
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  assertSePuedenAcreditarHoras(act);

  // RS-19: ABAC sobre el VOLUNTARIO (no sobre el coordinador que hace el registro).
  const voluntario = await Usuario.findById(ins.voluntarioId).select('esJudicial').lean();
  if (!(await permisos.puedeVerActividad({ esJudicial: Boolean(voluntario && voluntario.esJudicial) }, act))) {
    auditoria.registrar({ usuarioId: usuario.id, accion: 'acceso_denegado_abac', recurso: 'asistencia-manual', recursoId: ins._id, resultado: 'denegado', ip: ctx.ip });
    throw ApiError.forbidden('ACTIVIDAD_RESTRINGIDA', 'Esta persona no puede participar de esta actividad');
  }

  const duracion = (new Date(act.fechaFin) - new Date(act.fechaInicio)) / 3600000;
  const horas = redondear(horasPedidas !== undefined ? horasPedidas : duracion);
  if (horas > duracion) throw ApiError.badRequest('HORAS_INVALIDAS', `No puede superar la duración de la actividad (${redondear(duracion)} h)`);

  try {
    const asis = await Asistencia.create({
      inscripcionId: ins._id,
      actividadId: ins.actividadId,
      voluntarioId: ins.voluntarioId,
      organizacionId: ins.organizacionId,
      checkIn: act.fechaInicio,
      checkOut: new Date(new Date(act.fechaInicio).getTime() + horas * 3600000),
      horas,
      metodo: 'manual',
      estado: 'validada',
      validadaPor: usuario.id,
      validadaEn: new Date(),
    });
    await auditoria.registrar({ usuarioId: usuario.id, accion: 'asistencia_manual', recurso: 'asistencia', recursoId: asis._id, resultado: 'ok', ip: ctx.ip, detalle: `${horas} h` });
    return dto.asistencia(asis);
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('ASISTENCIA_YA_REGISTRADA', 'Esta persona ya tiene una asistencia registrada');
    throw err;
  }
}

/** GET /actividades/:id/asistencias — coordinador de la org. */
async function listarPorActividad(usuario, actividadId, ctx) {
  await actividadDeMiOrg(usuario, actividadId, ctx);
  const lista = await Asistencia.find({ actividadId }).sort({ checkIn: 1 }).populate({ path: 'voluntarioId', select: 'nombre apellido' }).lean();
  return lista.map(dto.asistencia);
}

/** PATCH /asistencias/:id/validar — registra la salida, calcula las horas y deja constancia (5.8). */
async function validar(usuario, asistenciaId, ctx) {
  const asis = await Asistencia.findById(asistenciaId);
  if (!asis) throw ApiError.notFound('ASISTENCIA_NO_ENCONTRADA', 'La asistencia no existe');
  permisos.assertMismaOrganizacion(usuario, asis, { recurso: 'asistencia', ip: ctx.ip }); // RS3
  if (asis.estado !== 'abierta') throw ApiError.conflict('ASISTENCIA_YA_VALIDADA', 'La asistencia ya fue validada');

  const act = await Actividad.findById(asis.actividadId).lean();
  assertSePuedenAcreditarHoras(act);
  const inicio = Math.max(asis.checkIn.getTime(), new Date(act.fechaInicio).getTime());
  const salida = new Date(Math.min(Date.now(), new Date(act.fechaFin).getTime()));
  const horas = redondear(Math.max(0, (salida.getTime() - inicio) / 3600000));

  asis.checkOut = salida;
  asis.horas = horas;
  asis.estado = 'validada';
  asis.validadaPor = usuario.id;
  asis.validadaEn = new Date();
  await asis.save();

  await auditoria.registrar({ usuarioId: usuario.id, accion: 'asistencia_validar', recurso: 'asistencia', recursoId: asis._id, resultado: 'ok', ip: ctx.ip, detalle: `${horas} h` });
  notificaciones.notificar(asis.voluntarioId, 'Asistencia validada', `Se validaron ${horas} horas en "${act.titulo}"`, { asistenciaId: String(asis._id) });
  return dto.asistencia(asis);
}

/** GET /usuarios/me/horas — solo voluntario judicial. Las horas se CALCULAN, no se guardan (4.2). */
async function misHoras(usuario) {
  if (!usuario.esJudicial) throw ApiError.forbidden('NO_ES_JUDICIAL', 'Este resumen es solo para voluntariado judicial');
  const [u, agregado] = await Promise.all([
    Usuario.findById(usuario.id).select('horasAsignadas').lean(),
    Asistencia.aggregate([
      { $match: { voluntarioId: new mongoose.Types.ObjectId(usuario.id), estado: 'validada' } },
      { $group: { _id: null, total: { $sum: '$horas' } } },
    ]),
  ]);
  const cumplidas = redondear(agregado.length ? agregado[0].total : 0);
  const asignadas = u.horasAsignadas || 0;
  return { horasAsignadas: asignadas, horasCumplidas: cumplidas, horasRestantes: redondear(Math.max(0, asignadas - cumplidas)) };
}

module.exports = { generarQR, registrarConQR, registrarManual, listarPorActividad, validar, misHoras };
