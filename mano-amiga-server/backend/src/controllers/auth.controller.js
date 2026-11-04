const authService = require('../services/auth.service');
const ctx = require('./ctx');

async function register(req, res) {
  const usuario = await authService.registrar(req.valid.body, ctx(req));
  res.status(201).json({ usuario });
}

async function login(req, res) {
  const resultado = await authService.login(req.valid.body, ctx(req));
  res.status(200).json(resultado);
}

async function refresh(req, res) {
  const resultado = await authService.refresh(req.valid.body.refreshToken, ctx(req));
  res.status(200).json(resultado);
}

async function logout(req, res) {
  await authService.logout(req.user, ctx(req));
  res.status(204).end();
}

async function reauth(req, res) {
  res.status(200).json(await authService.reauth(req.user, req.valid.body.password, ctx(req)));
}

module.exports = { register, login, refresh, logout, reauth };
