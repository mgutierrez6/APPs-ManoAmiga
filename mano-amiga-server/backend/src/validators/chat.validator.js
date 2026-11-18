const { Joi, idParam } = require('./comunes');

const listarMensajes = {
  params: idParam,
  query: Joi.object({ despues: Joi.date().iso() }),
};

const enviarMensaje = {
  params: idParam,
  body: Joi.object({ texto: Joi.string().trim().min(1).max(1000).required() }),
};

const porId = { params: idParam };

const misAvisos = { query: Joi.object({ limit: Joi.number().integer().min(1).max(50).default(30) }) };

module.exports = { listarMensajes, enviarMensaje, porId, misAvisos };
