const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const requerirReauth = require('../middlewares/reauth');
const validate = require('../middlewares/validate');
const v = require('../validators/admin.validator');
const c = require('../controllers/admin.controller');

// R7: Todo /admin es solo para el rol admin (RS1). Las ESCRITURAS además exigen reauth (RS9).
const router = Router();
router.use(authorize('admin'));

router.get('/organizaciones', validate(v.listarOrganizaciones), c.listarOrganizaciones);
router.post('/organizaciones', requerirReauth, validate(v.crearOrganizacion), c.crearOrganizacion);
router.delete('/organizaciones/:id', requerirReauth, validate(v.porId), c.bajaOrganizacion); // RS5

router.get('/usuarios', validate(v.listarUsuarios), c.listarUsuarios);
router.post('/coordinadores', requerirReauth, validate(v.asignarCoordinador), c.asignarCoordinador);
router.delete('/coordinadores/:id', requerirReauth, validate(v.porId), c.quitarCoordinador); // RS5
router.patch('/voluntarios/:id/judicial', requerirReauth, validate(v.actualizarJudicial), c.actualizarJudicial);

router.get('/judiciales/horas', validate(v.listado), c.horasJudiciales); // R10
router.get('/auditoria', validate(v.auditoria), c.auditoria); // RS9

module.exports = router;
