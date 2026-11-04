const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const { Usuario, Organizacion } = require('../models');
const { esPublico } = require('../security/matriz');

/*
Verifica el JWT y RELEE al usuario en la base en cada pedido (RS5, A4).
El token solo lleva el id (sub): el rol, la organización, el estado y el atributo judicial
se toman SIEMPRE de la base, así un cambio de permisos tiene efecto en el siguiente pedido.
 */
async function auth(req, res, next) {
  req.user = await usuarioDelToken(req);
  next();
}

/** Lee el Bearer token, lo verifica y devuelve el usuario releído de la base (o lanza 401). */
async function usuarioDelToken(req) {
  const header = req.get('authorization') || '';
  const [esquema, token] = header.split(' ');
  if (esquema !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'], // fijamos el algoritmo: evita el ataque "alg: none"
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  } catch (err) {
    throw ApiError.unauthorized('TOKEN_INVALIDO', 'La sesión venció o no es válida');
  }
  if (payload.typ !== 'access' || !payload.sub) throw ApiError.unauthorized('TOKEN_INVALIDO', 'La sesión no es válida');

  const usuario = await Usuario.findById(payload.sub).lean();
  if (!usuario || !usuario.activo) throw ApiError.unauthorized('TOKEN_INVALIDO', 'La sesión no es válida');

  // Un coordinador sin organización activa pierde el acceso inmediatamente (RS5).
  if (usuario.rol === 'coordinador') {
    const org = usuario.organizacionId ? await Organizacion.findById(usuario.organizacionId).lean() : null;
    if (!org || !org.activa) throw ApiError.unauthorized('ORGANIZACION_INACTIVA', 'Tu organización no está activa');
  }

  return {
    id: String(usuario._id),
    rol: usuario.rol,
    organizacionId: usuario.organizacionId ? String(usuario.organizacionId) : null,
    esJudicial: Boolean(usuario.esJudicial),
    nombre: usuario.nombre,
  };
}

/*  Para endpoints PÚBLICOS que igual adaptan la respuesta si hay sesión (ej.: el mapa aplica ABAC
  a un voluntario judicial). Un token inválido o ausente NO corta el pedido: se atiende como anónimo.
 */
async function authOpcional(req, res, next) {
  try {
    req.user = req.get('authorization') ? await usuarioDelToken(req) : null;
  } catch {
    req.user = null;
  }
  next();
}

/* RS8 : Denegar por defecto: TODO endpoint exige autenticación salvo los que la matriz (RS10)
 declara públicos. Si alguien agrega una ruta nueva y se olvida del auth, igual queda protegida.
 */
async function requerirAuthSalvoListaBlanca(req, res, next) {
  // req.baseUrl = "/api/v1" (donde está montado) + req.path = "/auth/login" -> ruta completa, como en la matriz.
  if (esPublico(req.method, `${req.baseUrl}${req.path}`)) return next();
  return auth(req, res, next);
}

module.exports = { auth, authOpcional, requerirAuthSalvoListaBlanca };
