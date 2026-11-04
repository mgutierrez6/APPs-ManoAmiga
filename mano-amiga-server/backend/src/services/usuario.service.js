const ApiError = require('../utils/ApiError');
const { paginar } = require('../utils/paginacion');
const { Usuario, Auditoria } = require('../models');
const dto = require('./dto');
const { esPushTokenValido } = require('./notificacion.service');

// /usuarios/me/... siempre toma el id del token, nunca de la URL (RS2).
async function obtenerPerfil(usuario) {
  const u = await Usuario.findById(usuario.id).lean();
  if (!u) throw ApiError.notFound();
  return dto.usuarioPropio(u);
}

async function registrarPushToken(usuario, token) {
  if (!esPushTokenValido(token)) throw ApiError.badRequest('PUSH_TOKEN_INVALIDO', 'Token de notificaciones inválido');
  // Guardamos como máximo 5 dispositivos por usuario.
  await Usuario.updateOne({ _id: usuario.id }, { $pull: { pushTokens: token } });
  await Usuario.updateOne({ _id: usuario.id }, { $push: { pushTokens: { $each: [token], $slice: -5 } } });
}

/* R8 : Editar datos de contacto y preferencias. Lista blanca explícita: el email, el rol, la organización
 y la condición judicial NO se pueden cambiar desde acá (el validator ya los descarta; esto es la 2.ª barrera).
 */
async function actualizarPerfil(usuario, datos) {
  const cambios = {};
  for (const campo of ['nombre', 'apellido', 'telefono']) {
    if (datos[campo] !== undefined) cambios[campo] = datos[campo];
  }
  if (datos.preferencias && datos.preferencias.tema) cambios['preferencias.tema'] = datos.preferencias.tema;
  const u = await Usuario.findByIdAndUpdate(usuario.id, { $set: cambios }, { returnDocument: 'after', runValidators: true }).lean();
  if (!u) throw ApiError.notFound();
  return dto.usuarioPropio(u);
}

// Eventos que se muestran en "Historial de accesos". Solo los de la propia cuenta (id del token).
const ACCIONES_DE_ACCESO = ['login', 'logout', 'password_cambio', 'refresh_reusado'];

async function misAccesos(usuario, q) {
  const filtro = { usuarioId: usuario.id, accion: { $in: ACCIONES_DE_ACCESO } };
  const res = await paginar(Auditoria.find(filtro).sort({ fecha: -1 }).lean(), Auditoria.countDocuments(filtro), q);
  return {
    ...res,
    data: res.data.map((a) => ({
      id: String(a._id),
      accion: a.accion,
      resultado: a.resultado,
      fecha: a.fecha,
      ip: a.ip || '',
      // En los logins exitosos el "detalle" es el dispositivo (user-agent recortado).
      dispositivo: a.accion === 'login' && a.resultado === 'ok' ? a.detalle || '' : '',
    })),
  };
}

module.exports = { obtenerPerfil, registrarPushToken, actualizarPerfil, misAccesos };
