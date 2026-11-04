const { Joi, objectId } = require('./comunes');

const puntos = {
  query: Joi.object({
    tipo: Joi.string().valid('todos', 'actividad', 'acopio').default('todos'),
    etiqueta: objectId,
    campana: objectId,
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    radio: Joi.number().min(0.1).max(200).default(10), // km
  }).and('lat', 'lng'),
};

module.exports = { puntos };
