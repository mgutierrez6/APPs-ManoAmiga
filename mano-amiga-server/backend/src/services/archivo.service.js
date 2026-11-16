const fs = require('fs/promises');
const path = require('path');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { Archivo, Publicacion, Actividad } = require('../models');
const permisos = require('./permisos');

/*
 Fotos (perfil, organización, publicaciones e historias).

 Seguridad:
  - Solo se aceptan JPG, PNG o WEBP, y el tipo se detecta por los primeros bytes del archivo
    (no se confía en lo que dice el pedido). Tamaño máximo: config.maxFotoBytes.
  - El nombre en disco es el _id del registro: nunca un nombre que mande el cliente (sin path traversal).
  - Quién puede subir cada tipo: perfil -> cualquiera; historia -> voluntario; organización y
    publicación -> coordinador (y queda atada a SU organización).
  - Para usar una foto en un perfil, historia o publicación hay que ser quien la subió (o, en fotos
    de organización, coordinador de la misma organización): nadie puede "robar" la foto de otro.
  - Ver una foto exige sesión. Las de perfil y las de "Mi historia" solo las ve su dueño.
 */
const ROLES_POR_USO = {
  perfil: ['voluntario', 'coordinador', 'admin'],
  historia: ['voluntario'],
  organizacion: ['coordinador'],
  publicacion: ['coordinador'],
};
const PRIVADAS = ['perfil', 'historia'];
const MAX_POR_HORA = 60;

const id = (v) => (v ? String(v._id || v) : null);
const ruta = (archivoId) => path.join(config.uploadsDir, String(archivoId));

/** URL (relativa a /api/v1) con la que la app pide la foto. */
const urlArchivo = (archivoId) => (archivoId ? `/archivos/${id(archivoId)}` : null);

function detectarTipo(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function subir(usuario, uso, buffer, ctx) {
  if (!ROLES_POR_USO[uso].includes(usuario.rol)) throw ApiError.forbidden('ROL_NO_PERMITIDO', 'Tu rol no puede subir este tipo de foto');
  if (['organizacion', 'publicacion'].includes(uso) && !usuario.organizacionId) throw ApiError.forbidden('SIN_ORGANIZACION', 'No tenés una organización asignada');
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw ApiError.badRequest('IMAGEN_VACIA', 'No llegó ninguna imagen');
  if (buffer.length > config.maxFotoBytes) throw new ApiError(413, 'DEMASIADO_GRANDE', 'La foto es demasiado grande');
  const tipo = detectarTipo(buffer);
  if (!tipo) throw ApiError.badRequest('FORMATO_INVALIDO', 'Solo se aceptan fotos JPG, PNG o WEBP');

  const recientes = await Archivo.countDocuments({ autorId: usuario.id, creadoEn: { $gte: new Date(Date.now() - 3600 * 1000) } });
  if (recientes >= MAX_POR_HORA) throw new ApiError(429, 'DEMASIADAS_FOTOS', 'Subiste muchas fotos seguidas. Probá de nuevo en un rato.');

  const doc = await Archivo.create({
    autorId: usuario.id,
    uso,
    organizacionId: ['organizacion', 'publicacion'].includes(uso) ? usuario.organizacionId : null,
    tipo,
    tamano: buffer.length,
  });
  try {
    await fs.mkdir(config.uploadsDir, { recursive: true });
    await fs.writeFile(ruta(doc._id), buffer, { flag: 'wx' });
  } catch (err) {
    await Archivo.deleteOne({ _id: doc._id });
    throw err;
  }
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'archivo_subir', recurso: 'archivo', recursoId: doc._id, resultado: 'ok', ip: ctx.ip, detalle: uso });
  return { id: String(doc._id), url: urlArchivo(doc._id) };
}

/** Devuelve el tipo y la ruta en disco de la foto, si quien la pide puede verla. */
async function paraVer(usuario, archivoId, ctx) {
  const doc = await Archivo.findById(archivoId).lean();
  if (!doc) throw ApiError.notFound('ARCHIVO_NO_ENCONTRADO', 'La foto no existe');
  if (PRIVADAS.includes(doc.uso)) {
    permisos.assertTitular(usuario, doc.autorId, { recurso: 'archivo', recursoId: archivoId, ip: ctx.ip });
  }
  // ABAC: una foto publicada sobre una actividad sensible no se le muestra a un voluntario judicial.
  if (doc.uso === 'publicacion' && usuario.esJudicial) {
    const pub = await Publicacion.findOne({ fotos: doc._id }).select('proyectoId').lean();
    const act = pub ? await Actividad.findById(pub.proyectoId).select('etiquetas').lean() : null;
    if (act) await permisos.assertABAC(usuario, act, ctx);
  }
  try {
    await fs.access(ruta(doc._id));
  } catch {
    throw ApiError.notFound('ARCHIVO_NO_ENCONTRADO', 'La foto no existe');
  }
  return { tipo: doc.tipo, ruta: ruta(doc._id) };
}

/**
 * Controla que las fotos que se quieren usar existan, sean del uso correcto y le pertenezcan a quien las usa.
 * Devuelve los ids sin repetidos, en el mismo orden.
 */
async function validarPropias(usuario, ids, uso) {
  const unicos = [...new Set((ids || []).map(String))];
  if (unicos.length === 0) return [];
  const docs = await Archivo.find({ _id: { $in: unicos } }).lean();
  const porId = new Map(docs.map((d) => [String(d._id), d]));
  for (const archivoId of unicos) {
    const d = porId.get(archivoId);
    const esDeSuOrg = uso === 'organizacion' && d && d.organizacionId && String(d.organizacionId) === usuario.organizacionId;
    if (!d || d.uso !== uso || (String(d.autorId) !== usuario.id && !esDeSuOrg)) {
      throw ApiError.badRequest('FOTO_INVALIDA', 'Alguna de las fotos no existe o no es tuya');
    }
  }
  return unicos;
}

module.exports = { subir, paraVer, validarPropias, urlArchivo, detectarTipo, USOS: Object.keys(ROLES_POR_USO) };
