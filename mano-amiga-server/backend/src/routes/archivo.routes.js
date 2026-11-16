const express = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const config = require('../config/env');
const v = require('../validators/archivo.validator');
const c = require('../controllers/archivo.controller');
const { TODOS } = require('../security/matriz');

const router = express.Router();

// La foto llega "cruda": el cuerpo del pedido son los bytes de la imagen. Es el ÚNICO endpoint con un
// límite mayor a 100 KB. El tipo real se controla en el service mirando los primeros bytes.
const cuerpoImagen = express.raw({ type: () => true, limit: config.maxFotoBytes });

router.post('/', authorize(...TODOS), validate(v.subir), cuerpoImagen, c.subir);
router.get('/:id', authorize(...TODOS), validate(v.porId), c.ver);

module.exports = router;
