const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { passwordLimiter } = require('../middlewares/rateLimit');
const v = require('../validators/usuario.validator');
const c = require('../controllers/usuario.controller');
const chat = require('../controllers/chat.controller');
const vc = require('../validators/chat.validator');
const { TODOS } = require('../security/matriz');

// Todas las rutas /usuarios/me/... toman el id del token, nunca de la URL (RS2).
const router = Router();

router.get('/me', authorize(...TODOS), c.me);
router.patch('/me', authorize(...TODOS), validate(v.actualizarMe), c.actualizarMe);
router.patch('/me/password', authorize(...TODOS), passwordLimiter, validate(v.cambiarPassword), c.cambiarPassword);
router.get('/me/accesos', authorize(...TODOS), validate(v.misAccesos), c.misAccesos);
router.post('/me/push-token', authorize(...TODOS), validate(v.pushToken), c.pushToken);
router.get('/me/inscripciones', authorize('voluntario'), validate(v.misInscripciones), c.misInscripciones);
router.get('/me/horas', authorize('voluntario'), c.misHoras);

// Avisos de la campanita: siempre los del token (RS2)
router.get('/me/notificaciones', authorize(...TODOS), validate(vc.misAvisos), chat.misAvisos);
router.get('/me/notificaciones/sin-leer', authorize(...TODOS), chat.sinLeer);
router.post('/me/notificaciones/leer-todas', authorize(...TODOS), chat.leerTodas);

module.exports = router;
