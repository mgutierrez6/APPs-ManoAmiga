const { Joi } = require('./comunes');

// Contraseña: mínimo 8 caracteres (ASVS v5), máximo 64 (bcrypt solo usa los primeros 72 bytes).
const password = Joi.string().min(8).max(64);
const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(120);

// Nota: "rol", "esJudicial", "organizacionId", etc. NO están en el esquema -> se descartan (mass assignment).
const register = {
  body: Joi.object({
    nombre: Joi.string().trim().min(1).max(60).required(),
    apellido: Joi.string().trim().min(1).max(60).required(),
    email: email.required(),
    password: password.required(),
    telefono: Joi.string().trim().pattern(/^\+?[0-9 ]{6,20}$/).allow('').messages({ 'string.pattern.base': 'teléfono inválido' }),
  }),
};

const login = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().max(120).required(),
    password: Joi.string().max(200).required(),
  }),
};

const refresh = {
  body: Joi.object({ refreshToken: Joi.string().hex().length(128).required() }),
};

const logout = {
  body: Joi.object({ refreshToken: Joi.string().hex().length(128) }),
};

const reauth = {
  body: Joi.object({ password: Joi.string().max(200).required() }),
};

module.exports = { register, login, refresh, logout, reauth, password };
