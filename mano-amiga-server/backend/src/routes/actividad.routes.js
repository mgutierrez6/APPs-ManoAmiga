const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const va = require('../validators/actividad.validator');
const vi = require('../validators/inscripcion.validator');
const vs = require('../validators/asistencia.validator');
const actividad = require('../controllers/actividad.controller');
const inscripcion = require('../controllers/inscripcion.controller');
const asistencia = require('../controllers/asistencia.controller');
const chat = require('../controllers/chat.controller');
const vc = require('../validators/chat.validator');
const { TODOS } = require('../security/matriz');

const router = Router();

// Orden de la cadena: authorize (rol, RS1) -> validate (datos) -> controller.
// La pertenencia a la organización (RS3), la titularidad (RS2) y ABAC se controlan en el service.
router.get('/', authorize(...TODOS), validate(va.listar), actividad.listar);
router.post('/', authorize('coordinador'), validate(va.crear), actividad.crear);
router.get('/:id', authorize(...TODOS), validate(va.porId), actividad.obtener);
router.patch('/:id', authorize('coordinador'), validate(va.actualizar), actividad.actualizar);
router.delete('/:id', authorize('coordinador'), validate(va.porId), actividad.eliminar);

// Inscripciones de una actividad
router.post('/:id/inscripciones', authorize('voluntario'), validate(vi.porId), inscripcion.inscribir);
router.get('/:id/inscripciones', authorize('coordinador'), validate(vi.listarPorActividad), inscripcion.listarPorActividad);

// Asistencias / QR
router.get('/:id/qr', authorize('coordinador'), validate(vs.porId), asistencia.generarQR);
router.post('/:id/asistencias', authorize('voluntario'), validate(vs.registrarConQR), asistencia.registrarConQR);
router.get('/:id/asistencias', authorize('coordinador'), validate(vs.porId), asistencia.listarPorActividad);

// Chat de la actividad: aceptados y coordinadores de la org (se controla en el service)
router.get('/:id/mensajes', authorize('voluntario', 'coordinador'), validate(vc.listarMensajes), chat.listarMensajes);
router.post('/:id/mensajes', authorize('voluntario', 'coordinador'), validate(vc.enviarMensaje), chat.enviarMensaje);

module.exports = router;
