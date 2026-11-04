const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// Access token: vence a los 15 minutos y SOLO lleva el id del usuario (sin rol) -> RS5.
function firmarAccessToken(usuarioId) {
  return jwt.sign({ typ: 'access' }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: String(usuarioId),
    expiresIn: config.accessTokenTtl,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
}

/* RS9 Token de reautenticación: lo recibe el admin después de confirmar su contraseña y
 habilita las acciones de administración durante 5 minutos. Va en el header X-Reauth-Token.
 Tiene su propio "typ", así no se puede usar como access token (ni al revés).
 */
const REAUTH_TTL_SEGUNDOS = 5 * 60;

function firmarReauthToken(usuarioId) {
  const token = jwt.sign({ typ: 'reauth' }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: String(usuarioId),
    expiresIn: REAUTH_TTL_SEGUNDOS,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
  return { reauthToken: token, expiraEn: new Date(Date.now() + REAUTH_TTL_SEGUNDOS * 1000) };
}

/** Devuelve el id del usuario si el token de reauth es válido; null si no. */
function verificarReauthToken(token) {
  try {
    const p = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: config.jwtIssuer, audience: config.jwtAudience });
    return p.typ === 'reauth' && p.sub ? p.sub : null;
  } catch {
    return null;
  }
}

// Refresh token: 64 bytes aleatorios (opaco, no es un JWT). En la base guardamos solo su HMAC.
function generarRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashRefreshToken(token) {
  return crypto.createHmac('sha256', config.jwtRefreshSecret).update(token).digest('hex');
}

module.exports = { firmarAccessToken, firmarReauthToken, verificarReauthToken, generarRefreshToken, hashRefreshToken };
