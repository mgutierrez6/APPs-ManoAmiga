const chatService = require('../services/chat.service');
const avisos = require('../services/notificacion.service');
const ctx = require('./ctx');

async function listarMensajes(req, res) {
  res.json(await chatService.listar(req.user, req.valid.params.id, req.valid.query, ctx(req)));
}

async function enviarMensaje(req, res) {
  res.status(201).json(await chatService.enviar(req.user, req.valid.params.id, req.valid.body, ctx(req)));
}

async function borrarMensaje(req, res) {
  await chatService.borrar(req.user, req.valid.params.id, ctx(req));
  res.status(204).end();
}

async function misAvisos(req, res) {
  res.json(await avisos.misAvisos(req.user, req.valid.query));
}

async function sinLeer(req, res) {
  res.json(await avisos.cantidadSinLeer(req.user));
}

async function leerTodas(req, res) {
  res.json(await avisos.marcarTodasLeidas(req.user));
}

async function marcarLeida(req, res) {
  res.json(await avisos.marcarLeida(req.user, req.valid.params.id, ctx(req)));
}

module.exports = { listarMensajes, enviarMensaje, borrarMensaje, misAvisos, sinLeer, leerTodas, marcarLeida };
