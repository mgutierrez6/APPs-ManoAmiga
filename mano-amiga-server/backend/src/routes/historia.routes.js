const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const v = require('../validators/historia.validator');
const c = require('../controllers/historia.controller');

// "Mi historia": solo voluntarios, y siempre sobre lo propio (id del token, RS2).
const router = Router();

router.get('/', authorize('voluntario'), c.listar);
router.get('/pendientes', authorize('voluntario'), c.pendientes);
router.post('/', authorize('voluntario'), validate(v.crear), c.crear);
router.patch('/:id', authorize('voluntario'), validate(v.actualizar), c.actualizar);

module.exports = router;
