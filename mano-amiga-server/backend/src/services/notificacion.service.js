const config = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Usuario, Notificacion } = require('../models');
const permisos = require('./permisos');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LOTE = 100; // Expo acepta hasta 100 mensajes por pedido

function esPushTokenValido(token) {
  return typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);
}

/**
 * Envía una notificación push a uno o varios usuarios vía el servicio de Expo (-> FCM / APNs).
 * Se usa la API HTTP de Expo directamente (una dependencia menos).
 * Límite de confianza 3 (5.11): el texto NUNCA incluye datos personales (ni teléfono, ni condición judicial).
 * Es "best effort": si falla, se loguea y la operación principal sigue.
 */
async function notificar(usuarioIds, titulo, cuerpo, data = {}) {
  if (config.esTest) return;
  try {
    const usuarios = await Usuario.find({ _id: { $in: [].concat(usuarioIds) } }).select('+pushTokens').lean();
    const mensajes = [];
    for (const u of usuarios) {
      for (const token of u.pushTokens || []) {
        if (esPushTokenValido(token)) mensajes.push({ to: token, sound: 'default', title: titulo, body: cuerpo, data });
      }
    }
    for (let i = 0; i < mensajes.length; i += LOTE) {
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (config.expoAccessToken) headers.Authorization = `Bearer ${config.expoAccessToken}`;
      const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(mensajes.slice(i, i + LOTE)) });
      if (!res.ok) logger.warn(`Expo Push respondió ${res.status}`);
    }
  } catch (err) {
    logger.warn('No se pudo enviar una notificación push', err.message);
  }
}

/* ---------------- Avisos de la campanita (dentro de la app) ---------------- */

const unicos = (ids) => [...new Set([].concat(ids).filter(Boolean).map(String))];

/**
 * Guarda un aviso para cada persona y, además, intenta mandarle el push (best effort).
 * Si falla, se loguea: un aviso nunca hace fallar la operación principal.
 */
async function avisar(usuarioIds, { tipo, titulo, texto, actividadId = null }) {
  const ids = unicos(usuarioIds);
  if (!ids.length) return;
  try {
    await Notificacion.insertMany(ids.map((usuarioId) => ({ usuarioId, tipo, titulo, texto, actividadId })));
    notificar(ids, titulo, texto, { tipo, actividadId: actividadId ? String(actividadId) : undefined });
  } catch (err) {
    logger.warn('No se pudo guardar un aviso', err.message);
  }
}

const textoChat = (n) => (n === 1 ? '1 mensaje nuevo en el chat' : `${n} mensajes nuevos en el chat`);

/**
 * Mensajes del chat, agrupados: cada persona tiene UN aviso sin leer por actividad y se le suma 1.
 * El push solo sale con el primer mensaje del grupo, para no llenarle el celular.
 */
async function avisarChat(usuarioIds, actividad) {
  const ids = unicos(usuarioIds);
  if (!ids.length) return;
  try {
    const nuevos = [];
    for (const usuarioId of ids) {
      const n = await Notificacion.findOneAndUpdate(
        { usuarioId, tipo: 'chat', actividadId: actividad._id, leida: false },
        { $inc: { cantidad: 1 }, $set: { fecha: new Date(), titulo: actividad.titulo }, $setOnInsert: { texto: textoChat(1) } },
        { upsert: true, returnDocument: 'after' }
      );
      if (n.cantidad === 1) nuevos.push(usuarioId);
      else await Notificacion.updateOne({ _id: n._id }, { $set: { texto: textoChat(n.cantidad) } });
    }
    if (nuevos.length) notificar(nuevos, actividad.titulo, textoChat(1), { tipo: 'chat', actividadId: String(actividad._id) });
  } catch (err) {
    logger.warn('No se pudo avisar el mensaje del chat', err.message);
  }
}

const dtoAviso = (n) => ({
  id: String(n._id),
  tipo: n.tipo,
  titulo: n.titulo,
  texto: n.texto,
  actividadId: n.actividadId ? String(n.actividadId) : null,
  leida: Boolean(n.leida),
  fecha: n.fecha,
});

/** GET /usuarios/me/notificaciones — solo las propias (id del token). */
async function misAvisos(usuario, { limit = 30 } = {}) {
  const [lista, sinLeer] = await Promise.all([
    Notificacion.find({ usuarioId: usuario.id }).sort({ fecha: -1 }).limit(limit).lean(),
    Notificacion.countDocuments({ usuarioId: usuario.id, leida: false }),
  ]);
  return { data: lista.map(dtoAviso), sinLeer };
}

/** GET /usuarios/me/notificaciones/sin-leer — para el numerito de la campanita (liviano, se consulta seguido). */
async function cantidadSinLeer(usuario) {
  return { sinLeer: await Notificacion.countDocuments({ usuarioId: usuario.id, leida: false }) };
}

/** PATCH /notificaciones/:id/leida — titular (RS2). */
async function marcarLeida(usuario, id, ctx) {
  const n = await Notificacion.findById(id);
  if (!n) throw ApiError.notFound('NOTIFICACION_NO_ENCONTRADA', 'El aviso no existe');
  permisos.assertTitular(usuario, n.usuarioId, { recurso: 'notificacion', recursoId: id, ip: ctx.ip });
  if (!n.leida) {
    n.leida = true;
    await n.save();
  }
  return dtoAviso(n);
}

/** POST /usuarios/me/notificaciones/leer-todas */
async function marcarTodasLeidas(usuario) {
  const r = await Notificacion.updateMany({ usuarioId: usuario.id, leida: false }, { $set: { leida: true } });
  return { marcadas: r.modifiedCount };
}

/** Al abrir el chat de una actividad, su aviso agrupado queda leído. */
async function leerChat(usuarioId, actividadId) {
  await Notificacion.updateMany({ usuarioId, tipo: 'chat', actividadId, leida: false }, { $set: { leida: true } });
}

module.exports = { notificar, esPushTokenValido, avisar, avisarChat, misAvisos, cantidadSinLeer, marcarLeida, marcarTodasLeidas, leerChat };
