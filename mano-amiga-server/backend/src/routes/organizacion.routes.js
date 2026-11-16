const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const v = require('../validators/organizacion.validator');
const c = require('../controllers/organizacion.controller');
const { TODOS } = require('../security/matriz');

const router = Router();

// "mia" = la organización del coordinador, tomada del token (RS3). Va antes que "/:id".
router.patch('/mia', authorize('coordinador'), validate(v.actualizarMia), c.actualizarMia);
router.get('/mia/realizadas', authorize('coordinador'), c.realizadasMias);
router.post('/mia/publicaciones', authorize('coordinador'), validate(v.publicarMia), c.publicarMia);

// Perfil público (con sesión) de cualquier organización activa.
router.get('/:id', authorize(...TODOS), validate(v.porId), c.perfil);
router.get('/:id/publicaciones', authorize(...TODOS), validate(v.publicaciones), c.publicaciones);
router.get('/:id/proximas', authorize(...TODOS), validate(v.porId), c.proximas);

module.exports = router;
