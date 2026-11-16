const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { Historia, Asistencia, Actividad } = require('../models');
const permisos = require('./permisos');
const archivos = require('./archivo.service');
const dto = require('./dto');

/*
 "Mi historia" (anuario del voluntario).
 - Todo se hace con el id del token (RS2): nadie ve ni edita la historia de otra persona.
 - Solo se puede contar una actividad a la que la persona fue: su asistencia tiene que estar VALIDADA.
 - Las fotos tienen que ser suyas y de uso "historia" (archivo.service.validarPropias).
 */
const MAX_FOTOS = 20;

const POBLAR = [
  { path: 'actividadId', select: 'titulo fechaInicio fechaFin direccion etiquetas', populate: { path: 'etiquetas', select: 'nombre clase' } },
  { path: 'organizacionId', select: 'nombre' },
];

const fechaDe = (h) => new Date(h.actividadId && h.actividadId.fechaInicio ? h.actividadId.fechaInicio : h.createdAt).getTime();

/** GET /historias — las historias propias, de la más reciente a la más vieja. */
async function listar(usuario) {
  const lista = await Historia.find({ voluntarioId: usuario.id }).populate(POBLAR).limit(500).lean();
  return lista.sort((a, b) => fechaDe(b) - fechaDe(a)).map(dto.historia);
}

/** GET /historias/pendientes — actividades a las que fue y todavía no contó ("Por agregar"). */
async function pendientes(usuario) {
  const [asistencias, contadas] = await Promise.all([
    Asistencia.find({ voluntarioId: usuario.id, estado: 'validada' }).distinct('actividadId'),
    Historia.find({ voluntarioId: usuario.id }).distinct('actividadId'),
  ]);
  const yaContadas = new Set(contadas.map(String));
  const ids = asistencias.filter((a) => !yaContadas.has(String(a)));
  const acts = await Actividad.find({ _id: { $in: ids }, estado: { $ne: 'cancelada' } })
    .sort({ fechaInicio: -1 })
    .populate([
      { path: 'etiquetas', select: 'nombre clase' },
      { path: 'organizacionId', select: 'nombre' },
    ])
    .lean();
  return acts.map(dto.actividadResumen);
}

/** POST /historias */
async function crear(usuario, datos, ctx) {
  const asis = await Asistencia.findOne({ actividadId: datos.actividadId, voluntarioId: usuario.id }).lean();
  if (!asis) throw ApiError.forbidden('SIN_ASISTENCIA', 'Solo podés contar actividades a las que fuiste');
  // Se cuenta recién cuando el coordinador validó la asistencia (así queda certificado que fue).
  if (asis.estado !== 'validada') throw ApiError.conflict('ASISTENCIA_SIN_VALIDAR', 'Vas a poder contarla cuando la organización valide tu asistencia');
  const act = await Actividad.findById(datos.actividadId).select('organizacionId estado').lean();
  if (!act || act.estado === 'cancelada') throw ApiError.notFound('ACTIVIDAD_NO_ENCONTRADA', 'La actividad no existe');

  const fotos = await archivos.validarPropias(usuario, datos.fotos, 'historia');
  let h;
  try {
    h = await Historia.create({
      voluntarioId: usuario.id, // del token
      actividadId: act._id,
      organizacionId: act.organizacionId,
      asistenciaId: asis._id,
      relato: datos.relato,
      fotos,
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('HISTORIA_EXISTENTE', 'Ya contaste esta actividad');
    throw err;
  }
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'historia_crear', recurso: 'historia', recursoId: h._id, resultado: 'ok', ip: ctx.ip });
  return dto.historia(await Historia.findById(h._id).populate(POBLAR).lean());
}

/** PATCH /historias/:id — cambiar el relato o la lista de fotos (por ejemplo, sumar fotos nuevas). */
async function actualizar(usuario, id, datos, ctx) {
  const h = await Historia.findById(id);
  if (!h) throw ApiError.notFound('HISTORIA_NO_ENCONTRADA', 'La historia no existe');
  permisos.assertTitular(usuario, h.voluntarioId, { recurso: 'historia', recursoId: id, ip: ctx.ip }); // RS2

  if (datos.relato !== undefined) h.relato = datos.relato;
  if (datos.fotos !== undefined) {
    const fotos = await archivos.validarPropias(usuario, datos.fotos, 'historia');
    if (fotos.length > MAX_FOTOS) throw ApiError.badRequest('DEMASIADAS_FOTOS', `Una historia puede tener hasta ${MAX_FOTOS} fotos`);
    h.fotos = fotos;
  }
  await h.save();
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'historia_editar', recurso: 'historia', recursoId: h._id, resultado: 'ok', ip: ctx.ip });
  return dto.historia(await Historia.findById(h._id).populate(POBLAR).lean());
}

module.exports = { listar, pendientes, crear, actualizar, MAX_FOTOS };
