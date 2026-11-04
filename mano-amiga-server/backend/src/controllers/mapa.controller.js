const mapaService = require('../services/mapa.service');

async function puntos(req, res) {
  res.json(await mapaService.puntos(req.user, req.valid.query));
}

module.exports = { puntos };
