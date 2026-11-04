const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { paginar } = require('../utils/paginacion');
const { Organizacion, Usuario, Actividad, Campana, Inscripcion, Asistencia, Auditoria } = require('../models');
const { revocarSesiones } = require('./auth.service');
const permisos = require('./permisos');

/* R7: Administración (solo rol admin; las escrituras además piden reauth -> RS9).
 Toda acción queda en la auditoría con el id del admin, el recurso y la IP.
 */

const id = (v) => (v ? String(v._id || v) : null);
const redondear = (n) => Math.round(n * 100) / 100;
const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function organizacionDto(o, coordinadores = 0) {
  return { id: id(o), nombre: o.nombre, contacto: o.contacto || '', convenioOSLA: Boolean(o.convenioOSLA), activa: Boolean(o.activa), coordinadores };
}

// El admin ve la condición judicial porque es quien administra el programa (R10). No ve el teléfono.
function usuarioDto(u) {
  return {
    id: id(u),
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    rol: u.rol,
    organizacion: u.organizacionId && u.organizacionId.nombre ? { id: id(u.organizacionId), nombre: u.organizacionId.nombre } : null,
    esJudicial: Boolean(u.esJudicial),
    horasAsignadas: u.esJudicial ? u.horasAsignadas || 0 : 0,
    activo: Boolean(u.activo),
  };
}

const registrar = (admin, accion, recurso, recursoId, ctx, detalle) =>
  auditoria.registrar({ usuarioId: admin.id, accion, recurso, recursoId, resultado: 'ok', ip: ctx.ip, detalle });

/* ------------------------------------------------------------------ Organizaciones */

async function listarOrganizaciones(q) {
  const filtro = q.buscar ? { nombre: { $regex: escaparRegex(q.buscar), $options: 'i' } } : {};
  const res = await paginar(Organizacion.find(filtro).sort({ activa: -1, nombre: 1 }).lean(), Organizacion.countDocuments(filtro), q);
  const conteo = await Usuario.aggregate([
    { $match: { rol: 'coordinador', activo: true, organizacionId: { $in: res.data.map((o) => o._id) } } },
    { $group: { _id: '$organizacionId', n: { $sum: 1 } } },
  ]);
  const porOrg = new Map(conteo.map((c) => [String(c._id), c.n]));
  return { ...res, data: res.data.map((o) => organizacionDto(o, porOrg.get(String(o._id)) || 0)) };
}

async function crearOrganizacion(admin, datos, ctx) {
  const existe = await Organizacion.exists({ nombre: { $regex: `^${escaparRegex(datos.nombre)}$`, $options: 'i' } });
  if (existe) throw ApiError.conflict('ORGANIZACION_EXISTENTE', 'Ya existe una organización con ese nombre');
  const org = await Organizacion.create({ nombre: datos.nombre, contacto: datos.contacto, convenioOSLA: datos.convenioOSLA, activa: true });
  await registrar(admin, 'organizacion_alta', 'organizacion', org._id, ctx, org.nombre);
  return organizacionDto(org.toObject());
}

/*Baja de una organización (RS5): queda inactiva, sus coordinadores pierden el acceso en el
 siguiente pedido (el middleware auth relee la organización) y además se borran sus sesiones,
 así tampoco pueden renovar el token. Sus actividades publicadas se cancelan y sus campañas terminan.
 */
async function bajaOrganizacion(admin, orgId, ctx) {
  const org = await Organizacion.findById(orgId);
  if (!org) throw ApiError.notFound('ORGANIZACION_NO_ENCONTRADA', 'La organización no existe');
  if (!org.activa) throw ApiError.conflict('ORGANIZACION_INACTIVA', 'La organización ya está dada de baja');

  org.activa = false;
  await org.save();
  const coords = await Usuario.find({ rol: 'coordinador', organizacionId: org._id }).distinct('_id');
  await revocarSesiones(coords);
  const { modifiedCount: actividades } = await Actividad.updateMany({ organizacionId: org._id, estado: 'publicada' }, { $set: { estado: 'cancelada' } });
  await Campana.updateMany({ organizacionId: org._id, estado: 'activa' }, { $set: { estado: 'finalizada' } });

  await registrar(admin, 'organizacion_baja', 'organizacion', org._id, ctx, `${coords.length} coordinador/es sin acceso, ${actividades} actividad/es canceladas`);
}

/* ------------------------------------------------------------------ Usuarios y coordinadores */

async function listarUsuarios(q) {
  const filtro = {};
  if (q.rol) filtro.rol = q.rol;
  if (q.buscar) {
    const r = { $regex: escaparRegex(q.buscar), $options: 'i' };
    filtro.$or = [{ nombre: r }, { apellido: r }, { email: r }];
  }
  const res = await paginar(
    Usuario.find(filtro).sort({ rol: 1, nombre: 1 }).populate({ path: 'organizacionId', select: 'nombre' }).lean(),
    Usuario.countDocuments(filtro),
    q
  );
  return { ...res, data: res.data.map(usuarioDto) };
}

async function usuarioConOrg(usuarioId) {
  return Usuario.findById(usuarioId).populate({ path: 'organizacionId', select: 'nombre' }).lean();
}

async function asignarCoordinador(admin, { usuarioId, organizacionId }, ctx) {
  const [u, org] = await Promise.all([Usuario.findById(usuarioId), Organizacion.findById(organizacionId).lean()]);
  if (!u) throw ApiError.notFound('USUARIO_NO_ENCONTRADO', 'El usuario no existe');
  if (!org || !org.activa) throw ApiError.badRequest('ORGANIZACION_INACTIVA', 'La organización no existe o está dada de baja');
  if (u.rol !== 'voluntario') throw ApiError.conflict('ROL_INVALIDO', 'Solo un voluntario puede pasar a ser coordinador');
  if (u.esJudicial) throw ApiError.conflict('ES_JUDICIAL', 'Una persona del programa judicial no puede ser coordinadora');
  if (!u.activo) throw ApiError.conflict('USUARIO_INACTIVO', 'La cuenta está desactivada');

  u.rol = 'coordinador';
  u.organizacionId = org._id;
  await u.save();
  // Con el rol nuevo tiene que volver a iniciar sesión para ver las pantallas de coordinador.
  await revocarSesiones(u._id);
  await registrar(admin, 'coordinador_alta', 'usuario', u._id, ctx, org.nombre);
  return usuarioDto(await usuarioConOrg(u._id));
}

/** RS5: al quitarle el rol vuelve a ser voluntario y se cierran TODAS sus sesiones. */
async function quitarCoordinador(admin, usuarioId, ctx) {
  const u = await Usuario.findById(usuarioId);
  if (!u) throw ApiError.notFound('USUARIO_NO_ENCONTRADO', 'El usuario no existe');
  if (u.rol !== 'coordinador') throw ApiError.conflict('NO_ES_COORDINADOR', 'El usuario no es coordinador');

  const orgAnterior = u.organizacionId;
  u.rol = 'voluntario';
  u.organizacionId = null;
  await u.save();
  await revocarSesiones(u._id);
  await registrar(admin, 'coordinador_baja', 'usuario', u._id, ctx, `Organización anterior: ${orgAnterior}`);
}

/*Condición judicial (atributo ABAC). Al marcar a alguien como judicial, se cancelan sus inscripciones
 activas a actividades SENSIBLES que todavía no terminaron (liberando el cupo): la regla ABAC
 también tiene que valer para lo que ya estaba inscripto.
 */
async function actualizarJudicial(admin, usuarioId, { esJudicial, horasAsignadas }, ctx) {
  const u = await Usuario.findById(usuarioId);
  if (!u) throw ApiError.notFound('USUARIO_NO_ENCONTRADO', 'El usuario no existe');
  if (u.rol !== 'voluntario') throw ApiError.conflict('ROL_INVALIDO', 'Solo un voluntario puede estar en el programa judicial');

  u.esJudicial = esJudicial;
  u.horasAsignadas = esJudicial ? horasAsignadas : 0;
  await u.save();

  let canceladas = 0;
  if (esJudicial) {
    const sensibles = await permisos.idsEtiquetasSensibles();
    const actividades = await Actividad.find({ etiquetas: { $in: sensibles }, fechaFin: { $gte: new Date() } }).distinct('_id');
    const inscripciones = await Inscripcion.find({ voluntarioId: u._id, actividadId: { $in: actividades }, estado: { $in: ['pendiente', 'aceptada'] } }).lean();
    for (const ins of inscripciones) {
      await Inscripcion.updateOne({ _id: ins._id }, { $set: { estado: 'cancelada' } });
      await Actividad.updateOne({ _id: ins.actividadId, inscriptos: { $gt: 0 } }, { $inc: { inscriptos: -1 } });
    }
    canceladas = inscripciones.length;
  }

  await registrar(admin, esJudicial ? 'judicial_alta' : 'judicial_baja', 'usuario', u._id, ctx, esJudicial ? `${horasAsignadas} h asignadas, ${canceladas} inscripción/es sensibles canceladas` : undefined);
  return usuarioDto(await usuarioConOrg(u._id));
}

/* ------------------------------------------------------------------ Horas judiciales (R10) */

/** Las horas cumplidas se CALCULAN sumando las asistencias validadas; nunca se guardan como número editable. */
async function horasJudiciales(q) {
  const filtro = { rol: 'voluntario', esJudicial: true };
  const res = await paginar(Usuario.find(filtro).sort({ apellido: 1, nombre: 1 }).lean(), Usuario.countDocuments(filtro), q);
  const ids = res.data.map((u) => new mongoose.Types.ObjectId(String(u._id)));
  const sumas = await Asistencia.aggregate([
    { $match: { voluntarioId: { $in: ids }, estado: 'validada' } },
    { $group: { _id: '$voluntarioId', total: { $sum: '$horas' } } },
  ]);
  const porUsuario = new Map(sumas.map((s) => [String(s._id), s.total]));
  return {
    ...res,
    data: res.data.map((u) => {
      const cumplidas = redondear(porUsuario.get(String(u._id)) || 0);
      const asignadas = u.horasAsignadas || 0;
      return {
        id: id(u),
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        horasAsignadas: asignadas,
        horasCumplidas: cumplidas,
        horasRestantes: redondear(Math.max(0, asignadas - cumplidas)),
      };
    }),
  };
}

/* ------------------------------------------------------------------ Auditoría (RS9) */

async function listarAuditoria(q) {
  const filtro = {};
  if (q.accion) filtro.accion = q.accion;
  if (q.resultado) filtro.resultado = q.resultado;
  const res = await paginar(
    Auditoria.find(filtro).sort({ fecha: -1 }).populate({ path: 'usuarioId', select: 'nombre email' }).lean(),
    Auditoria.countDocuments(filtro),
    q
  );
  return {
    ...res,
    data: res.data.map((a) => ({
      id: id(a),
      accion: a.accion,
      resultado: a.resultado,
      recurso: a.recurso || '',
      recursoId: a.recursoId || '',
      detalle: a.detalle || '',
      ip: a.ip || '',
      fecha: a.fecha,
      usuario: a.usuarioId && a.usuarioId.email ? { id: id(a.usuarioId), nombre: a.usuarioId.nombre, email: a.usuarioId.email } : null,
    })),
  };
}

module.exports = {
  listarOrganizaciones,
  crearOrganizacion,
  bajaOrganizacion,
  listarUsuarios,
  asignarCoordinador,
  quitarCoordinador,
  actualizarJudicial,
  horasJudiciales,
  listarAuditoria,
};
