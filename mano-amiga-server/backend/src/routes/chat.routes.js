const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const v = require('../validators/chat.validator');
const c = require('../controllers/chat.controller');

// DELETE /mensajes/:id — autor (RS2) o coordinador de la organización (RS3), se controla en el service.
const mensajes = Router();
mensajes.delete('/:id', authorize('voluntario', 'coordinador'), validate(v.porId), c.borrarMensaje);

// PATCH /notificaciones/:id/leida — titular (RS2).
const notificaciones = Router();
const { TODOS } = require('../security/matriz');
notificaciones.patch('/:id/leida', authorize(...TODOS), validate(v.porId), c.marcarLeida);

module.exports = { mensajes, notificaciones };
