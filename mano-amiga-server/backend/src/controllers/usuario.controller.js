const usuarioService = require('../services/usuario.service');
const inscripcionService = require('../services/inscripcion.service');
const asistenciaService = require('../services/asistencia.service');
const authService = require('../services/auth.service');
const ctx = require('./ctx');

async function me(req, res) {
  res.json(await usuarioService.obtenerPerfil(req.user));
}

async function pushToken(req, res) {
  await usuarioService.registrarPushToken(req.user, req.valid.body.token);
  res.status(204).end();
}

async function misInscripciones(req, res) {
  res.json(await inscripcionService.misInscripciones(req.user, req.valid.query));
}

async function misHoras(req, res) {
  res.json(await asistenciaService.misHoras(req.user));
}

async function actualizarMe(req, res) {
  res.json(await usuarioService.actualizarPerfil(req.user, req.valid.body));
}

async function cambiarPassword(req, res) {
  res.json(await authService.cambiarPassword(req.user, req.valid.body, ctx(req)));
}

async function misAccesos(req, res) {
  res.json(await usuarioService.misAccesos(req.user, req.valid.query));
}

module.exports = { me, pushToken, misInscripciones, misHoras, actualizarMe, cambiarPassword, misAccesos };
