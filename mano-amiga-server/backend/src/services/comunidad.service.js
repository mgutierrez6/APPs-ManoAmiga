const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { paginar } = require('../utils/paginacion');
const { Campana, Publicacion, Actividad, Inscripcion } = require('../models');
const notificaciones = require('./notificacion.service');
const permisos = require('./permisos');
const archivos = require('./archivo.service');
const dto = require('./dto');

const aPunto = ({ lat, lng }) => ({ type: 'Point', coordinates: [lng, lat] });

/** GET /campanas — público (RS8). Solo datos institucionales. */
async function listarCampanas(q) {
  const filtro = { estado: 'activa', fechaFin: { $gte: new Date() } };
  const res = await paginar(
    Campana.find(filtro).sort({ fechaFin: 1 }).populate({ path: 'organizacionId', select: 'nombre' }).lean(),
    Campana.countDocuments(filtro),
    q
  );
  return { ...res, data: res.data.map(dto.campana) };
}

/** POST /campanas — coordinador; la organización sale del token. */
async function crearCampana(usuario, datos, ctx) {
  const campana = await Campana.create({
    organizacionId: usuario.organizacionId,
    creadaPor: usuario.id,
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    objetivo: datos.objetivo,
    puntos: (datos.puntos || []).map((p) => ({ nombre: p.nombre, direccion: p.direccion, ubicacion: aPunto(p.ubicacion) })),
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
  });
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'campana_crear', recurso: 'campana', recursoId: campana._id, resultado: 'ok', ip: ctx.ip });
  const conOrg = await Campana.findById(campana._id).populate({ path: 'organizacionId', select: 'nombre' }).lean();
  return dto.campana(conOrg);
}

/** Un "proyecto" puede ser una actividad o una campaña. */
async function buscarProyecto(id) {
  const act = await Actividad.findById(id).select('organizacionId estado').lean();
  if (act) return { tipo: 'actividad', doc: act };
  const camp = await Campana.findById(id).select('organizacionId estado').lean();
  if (camp) return { tipo: 'campana', doc: camp };
  throw ApiError.notFound('PROYECTO_NO_ENCONTRADO', 'El proyecto no existe');
}

/** GET /proyectos/:id/publicaciones — feed público (RS8). */
async function listarPublicaciones(proyectoId, q) {
  await buscarProyecto(proyectoId);
  // Solo novedades: lo que la organización sube a su perfil (fotos) no aparece acá.
  const filtro = { proyectoId, destino: { $ne: 'perfil' } };
  const res = await paginar(
    Publicacion.find(filtro).sort({ fecha: -1 }).populate({ path: 'autorId', select: 'nombre' }).lean(),
    Publicacion.countDocuments(filtro),
    q
  );
  return { ...res, data: res.data.map(dto.publicacion) };
}

/** POST /proyectos/:id/publicaciones — coordinador de la org dueña del proyecto (RS3). */
async function crearPublicacion(usuario, proyectoId, datos, ctx) {
  const proyecto = await buscarProyecto(proyectoId);
  permisos.assertMismaOrganizacion(usuario, proyecto.doc, { recurso: proyecto.tipo, ip: ctx.ip });
  const fotos = await archivos.validarPropias(usuario, datos.fotos, 'publicacion'); // solo fotos propias

  const pub = await Publicacion.create({
    fotos,
    proyectoId,
    proyectoTipo: proyecto.tipo,
    organizacionId: usuario.organizacionId,
    autorId: usuario.id,
    tipo: 'post',
    destino: 'novedad',
    contenido: datos.contenido, // texto plano; la app lo muestra con <Text>, que no interpreta HTML
  });
  if (proyecto.tipo === 'actividad') {
    // Aviso a los inscriptos (pendientes y aceptados) de esa actividad.
    const inscriptos = await Inscripcion.find({ actividadId: proyectoId, estado: { $in: ['pendiente', 'aceptada'] } }).distinct('voluntarioId');
    const act = await Actividad.findById(proyectoId).select('titulo').lean();
    await notificaciones.avisar(inscriptos, { tipo: 'novedad', titulo: act.titulo, texto: 'Hay una novedad nueva de la organización.', actividadId: proyectoId });
  }
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'publicacion_crear', recurso: 'publicacion', recursoId: pub._id, resultado: 'ok', ip: ctx.ip });
  const conAutor = await Publicacion.findById(pub._id).populate({ path: 'autorId', select: 'nombre' }).lean();
  return dto.publicacion(conAutor);
}

module.exports = { listarCampanas, crearCampana, listarPublicaciones, crearPublicacion };
