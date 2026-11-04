const adminService = require('../services/admin.service');
const ctx = require('./ctx');

async function listarOrganizaciones(req, res) {
  res.json(await adminService.listarOrganizaciones(req.valid.query));
}

async function crearOrganizacion(req, res) {
  res.status(201).json(await adminService.crearOrganizacion(req.user, req.valid.body, ctx(req)));
}

async function bajaOrganizacion(req, res) {
  await adminService.bajaOrganizacion(req.user, req.valid.params.id, ctx(req));
  res.status(204).end();
}

async function listarUsuarios(req, res) {
  res.json(await adminService.listarUsuarios(req.valid.query));
}

async function asignarCoordinador(req, res) {
  res.status(201).json(await adminService.asignarCoordinador(req.user, req.valid.body, ctx(req)));
}

async function quitarCoordinador(req, res) {
  await adminService.quitarCoordinador(req.user, req.valid.params.id, ctx(req));
  res.status(204).end();
}

async function actualizarJudicial(req, res) {
  res.json(await adminService.actualizarJudicial(req.user, req.valid.params.id, req.valid.body, ctx(req)));
}

async function horasJudiciales(req, res) {
  res.json(await adminService.horasJudiciales(req.valid.query));
}

async function auditoria(req, res) {
  res.json(await adminService.listarAuditoria(req.valid.query));
}

module.exports = {
  listarOrganizaciones,
  crearOrganizacion,
  bajaOrganizacion,
  listarUsuarios,
  asignarCoordinador,
  quitarCoordinador,
  actualizarJudicial,
  horasJudiciales,
  auditoria,
};
