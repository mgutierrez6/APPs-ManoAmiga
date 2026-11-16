const { Joi, objectId, idParam } = require('./comunes');

const relato = Joi.string().trim().max(1000).allow('');
const fotos = Joi.array().items(objectId).max(20).unique();

const crear = {
  body: Joi.object({
    actividadId: objectId.required(),
    relato: relato.default(''),
    fotos: fotos.default([]),
  }),
};

const actualizar = {
  params: idParam,
  body: Joi.object({ relato, fotos }).min(1),
};

module.exports = { crear, actualizar };
