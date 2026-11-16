const { Joi, idParam } = require('./comunes');
const { USOS } = require('../models/Archivo.model');

const subir = { query: Joi.object({ uso: Joi.string().valid(...USOS).required() }) };
const porId = { params: idParam };

module.exports = { subir, porId };
