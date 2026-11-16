const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { paginar } = require('../utils/paginacion');
const { Organizacion, Usuario, Actividad, Inscripcion, Publicacion } = require('../models');
const permisos = require('./permisos');
const archivos = require('./archivo.service');
const dto = require('./dto');

/*
 Perfil público de una organización (lo ven todos los usuarios con sesión) y su feed de publicaciones.

 Seguridad:
  - Solo los coordinadores de la organización la editan y publican en ella. La organización SIEMPRE
    sale del token (usuario.organizacionId), nunca de la URL ni del body (RS3).
  - ABAC: a un voluntario judicial no se le muestran actividades sensibles, ni en "próximas" ni en el
    feed (las publicaciones sobre una actividad sensible tampoco), ni se cuentan en "realizadas".
  - De los coordinadores solo se muestra el nombre y la inicial del apellido.
 */

const POBLAR_ACTIVIDAD = [
  { path: 'etiquetas', select: 'nombre clase' },
  { path: 'organizacionId', select: 'nombre' },
];

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/** Condición ABAC para listar actividades: vacía si no es judicial. */
async function filtroABAC(usuario) {
  if (!usuario.esJudicial) return {};
  return { etiquetas: { $nin: await permisos.idsEtiquetasSensibles() } };
}

async function organizacionActiva(orgId) {
  const org = await Organizacion.findById(orgId).lean();
  if (!org || !org.activa) throw ApiError.notFound('ORGANIZACION_NO_ENCONTRADA', 'La organización no existe');
  return org;
}

/** Cantidad de voluntarios aceptados (los que se anotaron y quedaron) por actividad. */
async function participantesPorActividad(actividadIds) {
  if (!actividadIds.length) return new Map();
  const conteo = await Inscripcion.aggregate([
    { $match: { actividadId: { $in: actividadIds.map(oid) }, estado: 'aceptada' } },
    { $group: { _id: '$actividadId', n: { $sum: 1 } } },
  ]);
  return new Map(conteo.map((c) => [String(c._id), c.n]));
}

/** GET /organizaciones/:id */
async function perfil(usuario, orgId) {
  const org = await organizacionActiva(orgId);
  const abac = await filtroABAC(usuario);
  const ahora = new Date();
  const [coordinadores, realizadas, proximas] = await Promise.all([
    Usuario.find({ rol: 'coordinador', organizacionId: org._id, activo: true }).select('nombre apellido').sort({ nombre: 1 }).lean(),
    Actividad.countDocuments({ organizacionId: org._id, estado: { $ne: 'cancelada' }, fechaFin: { $lt: ahora }, ...abac }),
    Actividad.countDocuments({ organizacionId: org._id, estado: 'publicada', fechaFin: { $gte: ahora }, ...abac }),
  ]);
  return dto.organizacionPublica(org, { coordinadores, realizadas, proximas });
}

/** GET /organizaciones/:id/publicaciones — feed de la organización, lo más nuevo primero. */
async function publicaciones(usuario, orgId, q) {
  const org = await organizacionActiva(orgId);
  // Solo lo que la organización subió a SU perfil (fotos de lo que hicieron); las novedades de cada actividad no.
  const filtro = { organizacionId: org._id, proyectoTipo: 'actividad', destino: 'perfil' };
  if (usuario.esJudicial) {
    const sensibles = await Actividad.find({ organizacionId: org._id, etiquetas: { $in: await permisos.idsEtiquetasSensibles() } }).distinct('_id');
    filtro.proyectoId = { $nin: sensibles };
  }
  const res = await paginar(
    Publicacion.find(filtro).sort({ fecha: -1 }).populate({ path: 'autorId', select: 'nombre' }).lean(),
    Publicacion.countDocuments(filtro),
    q
  );
  const actIds = [...new Set(res.data.map((p) => String(p.proyectoId)))];
  const [acts, participantes] = await Promise.all([
    Actividad.find({ _id: { $in: actIds } }).select('titulo fechaInicio fechaFin etiquetas').populate({ path: 'etiquetas', select: 'nombre clase' }).lean(),
    participantesPorActividad(actIds),
  ]);
  const actPorId = new Map(acts.map((a) => [String(a._id), a]));
  return {
    ...res,
    data: res.data.map((p) => {
      const a = actPorId.get(String(p.proyectoId));
      return {
        ...dto.publicacion(p),
        actividad: a ? { id: String(a._id), titulo: a.titulo, fechaInicio: a.fechaInicio, fechaFin: a.fechaFin, tipo: dto.tipoDe(a.etiquetas) } : null,
        participantes: participantes.get(String(p.proyectoId)) || 0,
      };
    }),
  };
}

/** GET /organizaciones/:id/proximas — solo para ver (inscribirse se hace desde la actividad). */
async function proximas(usuario, orgId) {
  const org = await organizacionActiva(orgId);
  const filtro = { organizacionId: org._id, estado: 'publicada', fechaFin: { $gte: new Date() }, ...(await filtroABAC(usuario)) };
  const lista = await Actividad.find(filtro).sort({ fechaInicio: 1 }).limit(50).populate(POBLAR_ACTIVIDAD).lean();
  return lista.map(dto.actividad);
}

/** PATCH /organizaciones/mia — un coordinador edita el perfil de SU organización. */
async function actualizarMia(usuario, datos, ctx) {
  const org = await Organizacion.findById(usuario.organizacionId);
  if (!org || !org.activa) throw ApiError.notFound('ORGANIZACION_NO_ENCONTRADA', 'La organización no existe');

  for (const campo of ['descripcion', 'rubro', 'zona']) {
    if (datos[campo] !== undefined) org[campo] = datos[campo];
  }
  for (const campo of ['logoId', 'portadaId']) {
    if (datos[campo] === null) org[campo] = null;
    else if (datos[campo] !== undefined) [org[campo]] = await archivos.validarPropias(usuario, [datos[campo]], 'organizacion');
  }
  await org.save();
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'organizacion_editar_perfil', recurso: 'organizacion', recursoId: org._id, resultado: 'ok', ip: ctx.ip });
  return perfil(usuario, org._id);
}

/**
 * GET /organizaciones/mia/realizadas — actividades de SU organización que ya terminaron (no canceladas),
 * para elegir sobre cuál publicar. "publicada" indica si ya tiene alguna publicación.
 */
async function realizadasMias(usuario) {
  const lista = await Actividad.find({ organizacionId: usuario.organizacionId, estado: { $ne: 'cancelada' }, fechaFin: { $lt: new Date() } })
    .sort({ fechaFin: -1 })
    .limit(50)
    .populate(POBLAR_ACTIVIDAD)
    .lean();
  const ids = lista.map((a) => String(a._id));
  const [conPublicacion, participantes] = await Promise.all([
    Publicacion.find({ proyectoId: { $in: ids } }).distinct('proyectoId'),
    participantesPorActividad(ids),
  ]);
  const publicadas = new Set(conPublicacion.map(String));
  return lista.map((a) => ({ ...dto.actividad(a), publicada: publicadas.has(String(a._id)), participantes: participantes.get(String(a._id)) || 0 }));
}

/** POST /organizaciones/mia/publicaciones — publicar fotos y texto sobre una actividad YA realizada. */
async function publicarMia(usuario, datos, ctx) {
  const act = await Actividad.findById(datos.actividadId).lean();
  if (!act) throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');
  permisos.assertMismaOrganizacion(usuario, act, { recurso: 'actividad', ip: ctx.ip }); // RS3
  if (act.estado === 'cancelada') throw ApiError.conflict('ACTIVIDAD_CANCELADA', 'La actividad fue cancelada');
  if (new Date(act.fechaFin) > new Date()) throw ApiError.conflict('ACTIVIDAD_NO_TERMINO', 'Solo se puede publicar sobre actividades que ya se realizaron');

  const fotos = await archivos.validarPropias(usuario, datos.fotos, 'publicacion');
  const pub = await Publicacion.create({
    proyectoId: act._id,
    proyectoTipo: 'actividad',
    organizacionId: usuario.organizacionId, // del token
    autorId: usuario.id,
    tipo: 'post',
    destino: 'perfil',
    contenido: datos.contenido,
    fotos,
  });
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'publicacion_crear', recurso: 'publicacion', recursoId: pub._id, resultado: 'ok', ip: ctx.ip });
  const conAutor = await Publicacion.findById(pub._id).populate({ path: 'autorId', select: 'nombre' }).lean();
  return dto.publicacion(conAutor);
}

module.exports = { perfil, publicaciones, proximas, actualizarMia, realizadasMias, publicarMia };
