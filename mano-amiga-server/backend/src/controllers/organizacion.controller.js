const organizacionService = require('../services/organizacion.service');
const ctx = require('./ctx');

async function perfil(req, res) {
  res.json(await organizacionService.perfil(req.user, req.valid.params.id));
}

async function publicaciones(req, res) {
  res.json(await organizacionService.publicaciones(req.user, req.valid.params.id, req.valid.query));
}

async function proximas(req, res) {
  res.json(await organizacionService.proximas(req.user, req.valid.params.id));
}

async function actualizarMia(req, res) {
  res.json(await organizacionService.actualizarMia(req.user, req.valid.body, ctx(req)));
}

async function realizadasMias(req, res) {
  res.json(await organizacionService.realizadasMias(req.user));
}

async function publicarMia(req, res) {
  res.status(201).json(await organizacionService.publicarMia(req.user, req.valid.body, ctx(req)));
}

module.exports = { perfil, publicaciones, proximas, actualizarMia, realizadasMias, publicarMia };
