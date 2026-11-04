const { Router } = require('express');
const actividadController = require('../controllers/actividad.controller');
const comunidad = require('./comunidad.routes');

const api = Router();

api.get('/health', (req, res) => res.json({ ok: true }));
api.get('/etiquetas', actividadController.etiquetas); // pública

// Tabla de montaje: prefijo -> router. Se exporta para que el test de la matriz (RS10)
// pueda listar todas las rutas que existen y compararlas con la matriz documentada.
const MONTAJES = [
  ['/auth', require('./auth.routes')],
  ['/usuarios', require('./usuario.routes')],
  ['/actividades', require('./actividad.routes')],
  ['/inscripciones', require('./inscripcion.routes')],
  ['/asistencias', require('./asistencia.routes')],
  ['/campanas', comunidad.campanas],
  ['/proyectos', comunidad.proyectos],
  ['/mapa', require('./mapa.routes')],
  ['/admin', require('./admin.routes')],
];
for (const [prefijo, router] of MONTAJES) api.use(prefijo, router);

/** Lista "METODO /api/v1/ruta" de todo lo registrado. */
function listarRutas(base = '/api/v1') {
  const rutas = [];
  const agregar = (prefijo, router) => {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const metodo of Object.keys(layer.route.methods)) {
        rutas.push(`${metodo.toUpperCase()} ${base}${prefijo}${layer.route.path === '/' ? '' : layer.route.path}`);
      }
    }
  };
  agregar('', api);
  for (const [prefijo, router] of MONTAJES) agregar(prefijo, router);
  return rutas;
}

module.exports = api;
module.exports.listarRutas = listarRutas;
