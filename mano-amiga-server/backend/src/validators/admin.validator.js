const { Joi, objectId, idParam, paginacion } = require('./comunes');

const listarOrganizaciones = {
  query: Joi.object({ buscar: Joi.string().trim().max(100), ...paginacion }),
};

const crearOrganizacion = {
  body: Joi.object({
    nombre: Joi.string().trim().min(2).max(100).required(),
    contacto: Joi.string().trim().max(120).allow(''),
    convenioOSLA: Joi.boolean().default(false),
  }),
};

const listarUsuarios = {
  query: Joi.object({
    buscar: Joi.string().trim().max(100),
    rol: Joi.string().valid('voluntario', 'coordinador', 'admin'),
    ...paginacion,
  }),
};

const asignarCoordinador = {
  body: Joi.object({ usuarioId: objectId.required(), organizacionId: objectId.required() }),
};

// esJudicial = true exige las horas dictadas; false las pone en 0.
const actualizarJudicial = {
  params: idParam,
  body: Joi.object({
    esJudicial: Joi.boolean().required(),
    horasAsignadas: Joi.when('esJudicial', {
      is: true,
      then: Joi.number().integer().min(1).max(2000).required(),
      otherwise: Joi.forbidden(),
    }),
  }),
};

const auditoria = {
  query: Joi.object({
    accion: Joi.string().trim().max(60),
    resultado: Joi.string().valid('ok', 'fallo', 'denegado'),
    ...paginacion,
  }),
};

const listado = { query: Joi.object({ ...paginacion }) };
const porId = { params: idParam };

module.exports = { listarOrganizaciones, crearOrganizacion, listarUsuarios, asignarCoordinador, actualizarJudicial, auditoria, listado, porId };
