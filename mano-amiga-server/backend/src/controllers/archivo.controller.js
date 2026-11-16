const archivoService = require('../services/archivo.service');
const ctx = require('./ctx');

async function subir(req, res) {
  res.status(201).json(await archivoService.subir(req.user, req.valid.query.uso, req.body, ctx(req)));
}

async function ver(req, res) {
  const { tipo, ruta } = await archivoService.paraVer(req.user, req.valid.params.id, ctx(req));
  res.set({
    'Content-Type': tipo,
    'Cache-Control': 'private, max-age=86400', // una foto no cambia nunca: cada foto nueva tiene otro id
    'Content-Disposition': 'inline',
  });
  res.sendFile(ruta);
}

module.exports = { subir, ver };
