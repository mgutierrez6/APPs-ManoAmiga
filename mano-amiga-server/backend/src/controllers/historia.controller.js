const historiaService = require('../services/historia.service');
const ctx = require('./ctx');

async function listar(req, res) {
  res.json(await historiaService.listar(req.user));
}

async function pendientes(req, res) {
  res.json(await historiaService.pendientes(req.user));
}

async function crear(req, res) {
  res.status(201).json(await historiaService.crear(req.user, req.valid.body, ctx(req)));
}

async function actualizar(req, res) {
  res.json(await historiaService.actualizar(req.user, req.valid.params.id, req.valid.body, ctx(req)));
}

module.exports = { listar, pendientes, crear, actualizar };
