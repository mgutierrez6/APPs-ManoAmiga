const { Joi, objectId, idParam, paginacion } = require('./comunes');

const porId = { params: idParam };

const publicaciones = { params: idParam, query: Joi.object({ ...paginacion }) };

// Lista blanca: el nombre, el convenio y el estado de la organización solo los cambia el admin.
const actualizarMia = {
  body: Joi.object({
    descripcion: Joi.string().trim().max(500).allow(''),
    rubro: Joi.string().trim().max(60).allow(''),
    zona: Joi.string().trim().max(60).allow(''),
    logoId: objectId.allow(null),
    portadaId: objectId.allow(null),
  }).min(1),
};

const publicarMia = {
  body: Joi.object({
    actividadId: objectId.required(),
    contenido: Joi.string().trim().min(1).max(2000).required(),
    fotos: Joi.array().items(objectId).max(10).unique().default([]),
  }),
};

module.exports = { porId, publicaciones, actualizarMia, publicarMia };
