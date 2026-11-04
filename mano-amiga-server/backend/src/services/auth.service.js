const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { Usuario, Organizacion, Sesion } = require('../models');
const tokens = require('./token.service');
const dto = require('./dto');

// Hash "de mentira" para comparar cuando el email no existe: así el login tarda lo mismo
// exista o no la cuenta, y no se puede averiguar qué emails están registrados por el tiempo.
const HASH_FALSO = bcrypt.hashSync('contraseña-que-no-existe', config.bcryptCosto);

function credencialesInvalidas() {
  return ApiError.unauthorized('CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos');
}

/** Registro: el rol SIEMPRE es voluntario (5.1). Coordinadores y admins los crea el administrador. */
async function registrar(datos, ctx) {
  const existe = await Usuario.exists({ email: datos.email });
  if (existe) throw ApiError.conflict('EMAIL_EN_USO', 'Ya existe una cuenta con ese email');

  const passwordHash = await bcrypt.hash(datos.password, config.bcryptCosto);
  const usuario = await Usuario.create({
    nombre: datos.nombre,
    apellido: datos.apellido,
    email: datos.email,
    telefono: datos.telefono || '',
    passwordHash,
    rol: 'voluntario',
  });
  await auditoria.registrar({ usuarioId: usuario._id, accion: 'registro', recurso: 'usuario', recursoId: usuario._id, resultado: 'ok', ip: ctx.ip });
  return dto.usuarioSesion(usuario);
}

async function crearSesion(usuarioId, ctx, familia) {
  const refreshToken = tokens.generarRefreshToken();
  await Sesion.create({
    userId: usuarioId,
    tokenHash: tokens.hashRefreshToken(refreshToken),
    familia: familia || crypto.randomUUID(),
    dispositivo: (ctx.dispositivo || '').slice(0, 200),
    expiraEn: new Date(Date.now() + config.refreshTokenDias * 24 * 60 * 60 * 1000),
  });
  return { accessToken: tokens.firmarAccessToken(usuarioId), refreshToken };
}

/** Login con mensaje genérico y auditoría de éxitos y fallos (5.1). */
async function login({ email, password }, ctx) {
  const usuario = await Usuario.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, usuario ? usuario.passwordHash : HASH_FALSO);

  if (!usuario || !ok || !usuario.activo) {
    await auditoria.registrar({ usuarioId: usuario ? usuario._id : null, accion: 'login', resultado: 'fallo', ip: ctx.ip });
    throw credencialesInvalidas();
  }
  if (usuario.rol === 'coordinador') {
    const org = await Organizacion.findById(usuario.organizacionId).lean();
    if (!org || !org.activa) {
      await auditoria.registrar({ usuarioId: usuario._id, accion: 'login', resultado: 'fallo', ip: ctx.ip, detalle: 'organización inactiva' });
      throw credencialesInvalidas();
    }
  }

  const par = await crearSesion(usuario._id, ctx);
  await auditoria.registrar({ usuarioId: usuario._id, accion: 'login', resultado: 'ok', ip: ctx.ip, detalle: (ctx.dispositivo || '').slice(0, 100) });
  return { ...par, usuario: dto.usuarioSesion(usuario) };
}

/**
 * Renovación con ROTACIÓN (5.2): cada refresh token sirve una sola vez.
 * Si llega uno ya usado, alguien lo robó: se cierran TODAS las sesiones del usuario.
 */
async function refresh(refreshToken, ctx) {
  const tokenHash = tokens.hashRefreshToken(refreshToken);
  const sesion = await Sesion.findOne({ tokenHash });
  if (!sesion || sesion.expiraEn < new Date()) throw ApiError.unauthorized('SESION_INVALIDA', 'La sesión venció, volvé a iniciar sesión');

  // Marcamos como usada de forma atómica: si dos pedidos llegan a la vez, solo uno gana.
  const marcada = await Sesion.findOneAndUpdate({ _id: sesion._id, reemplazada: false }, { $set: { reemplazada: true } });
  if (!marcada) {
    await Sesion.deleteMany({ userId: sesion.userId });
    await auditoria.registrar({ usuarioId: sesion.userId, accion: 'refresh_reusado', resultado: 'denegado', ip: ctx.ip, detalle: 'Se cerraron todas las sesiones' });
    throw ApiError.unauthorized('SESION_INVALIDA', 'La sesión venció, volvé a iniciar sesión');
  }

  const usuario = await Usuario.findById(sesion.userId).lean();
  if (!usuario || !usuario.activo) {
    await Sesion.deleteMany({ userId: sesion.userId });
    throw ApiError.unauthorized('SESION_INVALIDA', 'La sesión venció, volvé a iniciar sesión');
  }
  const par = await crearSesion(usuario._id, ctx, sesion.familia);
  return { ...par, usuario: dto.usuarioSesion(usuario) };
}

/** Logout: se borran todas las sesiones del usuario (5.2 · Revocación). */
async function logout(usuario, ctx) {
  await Sesion.deleteMany({ userId: usuario.id });
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'logout', resultado: 'ok', ip: ctx.ip });
}

/** RS5: se usa desde el panel de admin al dar de baja un coordinador u organización. */
async function revocarSesiones(usuarioIds) {
  await Sesion.deleteMany({ userId: { $in: [].concat(usuarioIds) } });
}

/* RS9: El admin vuelve a poner su contraseña y recibe un token de reauth de 5 minutos.
 Los fallos quedan auditados (muchos seguidos = posible credencial robada).
 */
async function reauth(usuario, password, ctx) {
  const u = await Usuario.findById(usuario.id).select('+passwordHash');
  const ok = u ? await bcrypt.compare(password, u.passwordHash) : false;
  if (!ok) {
    await auditoria.registrar({ usuarioId: usuario.id, accion: 'reauth', resultado: 'fallo', ip: ctx.ip });
    throw credencialesInvalidas();
  }
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'reauth', resultado: 'ok', ip: ctx.ip });
  return tokens.firmarReauthToken(usuario.id);
}

/* R8: Cambio de contraseña. Pide la actual, cierra TODAS las sesiones (RS5: si alguien más tenía
 la cuenta abierta, queda afuera) y devuelve una sesión nueva solo para este dispositivo.
 La contraseña actual incorrecta es 400 (no 401), así la app no la confunde con una sesión vencida.
 */
async function cambiarPassword(usuario, { actual, nueva }, ctx) {
  const u = await Usuario.findById(usuario.id).select('+passwordHash');
  if (!u) throw ApiError.unauthorized();
  if (!(await bcrypt.compare(actual, u.passwordHash))) {
    await auditoria.registrar({ usuarioId: usuario.id, accion: 'password_cambio', resultado: 'fallo', ip: ctx.ip });
    throw ApiError.badRequest('PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta');
  }
  if (await bcrypt.compare(nueva, u.passwordHash)) {
    throw ApiError.badRequest('PASSWORD_REPETIDA', 'La nueva contraseña tiene que ser distinta a la actual');
  }
  u.passwordHash = await bcrypt.hash(nueva, config.bcryptCosto);
  await u.save();

  await revocarSesiones(u._id);
  const par = await crearSesion(u._id, ctx);
  await auditoria.registrar({ usuarioId: usuario.id, accion: 'password_cambio', resultado: 'ok', ip: ctx.ip, detalle: 'Se cerraron las demás sesiones' });
  return { ...par, usuario: dto.usuarioSesion(u) };
}

module.exports = { registrar, login, refresh, logout, revocarSesiones, reauth, cambiarPassword };
