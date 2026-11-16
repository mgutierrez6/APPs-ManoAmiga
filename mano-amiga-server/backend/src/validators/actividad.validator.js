const { Joi, objectId, idParam, paginacion, ubicacion } = require('./comunes');

const campos = {
  titulo: Joi.string().trim().min(3).max(100),
  descripcion: Joi.string().trim().min(10).max(2000),
  etiquetas: Joi.array().items(objectId).max(10).unique(),
  ubicacion,
  direccion: Joi.string().trim().max(200).allow(''),
  fechaInicio: Joi.date().iso(),
  fechaFin: Joi.date().iso(),
  // null = cupos ilimitados. Se exige mandarlo explícito al crear, para que nadie quede "sin límite" por olvido.
  cupo: Joi.number().integer().min(1).max(10000).allow(null),
};

// La organización NO viene en el body: se toma del token del coordinador.
const crear = {
  body: Joi.object({
    titulo: campos.titulo.required(),
    descripcion: campos.descripcion.required(),
    etiquetas: campos.etiquetas.default([]),
    ubicacion: campos.ubicacion.required(),
    direccion: campos.direccion,
    fechaInicio: campos.fechaInicio.required(),
    fechaFin: campos.fechaFin.greater(Joi.ref('fechaInicio')).required(),
    cupo: campos.cupo.required(),
    // Pregunta obligatoria: si es sí, la actividad no se muestra a voluntarios judiciales (ABAC).
    contactoMenores: Joi.boolean().required(),
  }),
};

const actualizar = {
  params: idParam,
  body: Joi.object({
    titulo: campos.titulo,
    descripcion: campos.descripcion,
    etiquetas: campos.etiquetas,
    ubicacion: campos.ubicacion,
    direccion: campos.direccion,
    fechaInicio: campos.fechaInicio,
    fechaFin: campos.fechaFin,
    cupo: campos.cupo,
    contactoMenores: Joi.boolean(),
  }).min(1),
};

const listar = {
  query: Joi.object({
    etiqueta: objectId,
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    radio: Joi.number().min(0.1).max(200).default(10), // km
    mias: Joi.boolean().default(false), // coordinador: actividades de su organización
    desde: Joi.date().iso(), // calendario: actividades que terminan después de "desde"...
    hasta: Joi.date().iso(), // ...y empiezan antes de "hasta"
    ...paginacion,
  }).and('lat', 'lng'),
};

const porId = { params: idParam };

module.exports = { crear, actualizar, listar, porId };
