const { Joi, paginacion } = require('./comunes');
const { password } = require('./auth.validator');

const pushToken = {
  body: Joi.object({ token: Joi.string().trim().max(200).required() }),
};

const misInscripciones = {
  query: Joi.object({
    estado: Joi.string().valid('pendiente', 'aceptada', 'rechazada', 'cancelada'),
    ...paginacion,
  }),
};

// R8 : Solo datos de contacto y preferencias. email, rol, esJudicial, horasAsignadas... no están -> se descartan.
const actualizarMe = {
  body: Joi.object({
    nombre: Joi.string().trim().min(1).max(60),
    apellido: Joi.string().trim().min(1).max(60),
    telefono: Joi.string().trim().pattern(/^\+?[0-9 ]{6,20}$/).allow('').messages({ 'string.pattern.base': 'teléfono inválido' }),
    preferencias: Joi.object({ tema: Joi.string().valid('sistema', 'claro', 'oscuro').required() }),
  }).min(1),
};

const cambiarPassword = {
  body: Joi.object({
    actual: Joi.string().max(200).required(),
    nueva: password.required(),
  }),
};

const misAccesos = { query: Joi.object({ ...paginacion }) };

module.exports = { pushToken, misInscripciones, actualizarMe, cambiarPassword, misAccesos };
