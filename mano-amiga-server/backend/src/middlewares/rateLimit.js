const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Límite de intentos de login (5.1): 5 intentos fallidos cada 15 minutos por IP + email.
 * Al superarlo se responde 429. Los logins exitosos no cuentan.
 * (El límite general de 100 pedidos por minuto está en el front-service.)
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `${ipKeyGenerator(req.ip)}|${email}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'DEMASIADOS_INTENTOS', message: 'Demasiados intentos. Probá de nuevo en 15 minutos.' },
    });
  },
});

/* Pedidos que reciben la contraseña con la sesión ya iniciada (reauth del admin y cambio de contraseña):
 5 intentos fallidos cada 15 minutos POR USUARIO, para que un token robado no sirva para adivinarla.
 Se considera fallido cualquier respuesta 4xx. 
 */
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `pwd|${req.user ? req.user.id : ipKeyGenerator(req.ip)}`,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'DEMASIADOS_INTENTOS', message: 'Demasiados intentos. Probá de nuevo en 15 minutos.' },
    });
  },
});

module.exports = { loginLimiter, passwordLimiter };
