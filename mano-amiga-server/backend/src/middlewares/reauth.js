const ApiError = require('../utils/ApiError');
const auditoria = require('../utils/auditoria');
const { verificarReauthToken } = require('../services/token.service');

/* RS9:  Además del rol, las acciones de administración exigen una reautenticación reciente:
 el header X-Reauth-Token (5 min, se obtiene con POST /auth/reauth) tiene que ser del MISMO usuario.
 Así, un access token robado de un admin no alcanza para dar de alta o de baja nada.
 Va DESPUÉS de authorize('admin').
 */
function requerirReauth(req, res, next) {
  const sub = verificarReauthToken(req.get('x-reauth-token') || '');
  if (!sub || sub !== req.user.id) {
    auditoria.registrar({
      usuarioId: req.user.id,
      accion: 'reauth_faltante',
      recurso: `${req.method} ${req.baseUrl}${req.route ? req.route.path : ''}`,
      resultado: 'denegado',
      ip: req.ip,
    });
    throw ApiError.forbidden('REAUTH_REQUERIDA', 'Confirmá tu contraseña para hacer esta acción');
  }
  next();
}

module.exports = requerirReauth;
