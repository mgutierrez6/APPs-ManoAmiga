const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { loginLimiter, passwordLimiter } = require('../middlewares/rateLimit');
const v = require('../validators/auth.validator');
const c = require('../controllers/auth.controller');
const { TODOS } = require('../security/matriz');

// Nota: la autenticación (JWT) la hace el middleware global "requerirAuthSalvoListaBlanca" (RS8),
// ANTES de llegar acá. Cada ruta solo agrega el control por rol (RS1) y la validación.
const router = Router();

router.post('/register', validate(v.register), c.register); // pública
router.post('/login', loginLimiter, validate(v.login), c.login); // pública + rate limit
router.post('/refresh', validate(v.refresh), c.refresh); // pública (la credencial es el refresh token)
router.post('/logout', authorize(...TODOS), validate(v.logout), c.logout);
router.post('/reauth', authorize('admin'), passwordLimiter, validate(v.reauth), c.reauth); // RS9

module.exports = router;
