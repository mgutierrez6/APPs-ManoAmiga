const { Joi, idParam, paginacion, ubicacion } = require('./comunes');

const crearCampana = {
  body: Joi.object({
    titulo: Joi.string().trim().min(3).max(100).required(),
    descripcion: Joi.string().trim().min(10).max(2000).required(),
    objetivo: Joi.string().trim().max(300).allow(''),
    puntos: Joi.array()
      .items(
        Joi.object({
          nombre: Joi.string().trim().min(2).max(100).required(),
          direccion: Joi.string().trim().max(200).allow(''),
          ubicacion: ubicacion.required(),
        })
      )
      .max(20)
      .default([]),
    fechaInicio: Joi.date().iso().required(),
    fechaFin: Joi.date().iso().greater(Joi.ref('fechaInicio')).required(),
  }),
};

const listarCampanas = { query: Joi.object({ ...paginacion }) };

const listarPublicaciones = { params: idParam, query: Joi.object({ ...paginacion }) };

const crearPublicacion = {
  params: idParam,
  body: Joi.object({
    contenido: Joi.string().trim().min(1).max(2000).required(),
    fotos: Joi.array().items(Joi.string().hex().length(24)).max(10).unique().default([]),
  }),
};

module.exports = { crearCampana, listarCampanas, listarPublicaciones, crearPublicacion };
