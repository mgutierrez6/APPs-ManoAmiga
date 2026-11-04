const { Router } = require('express');
const { authOpcional } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const v = require('../validators/mapa.validator');
const c = require('../controllers/mapa.controller');

const router = Router();

// Pública (lista blanca RS8). authOpcional: si hay sesión, se usa para aplicar ABAC.
router.get('/puntos', authOpcional, validate(v.puntos), c.puntos);

module.exports = router;
