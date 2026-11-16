/**
 * Front-service (DMZ) · Mano Amiga
 * Única pieza expuesta a Internet (1.2). No guarda datos ni conoce reglas de negocio:
 *   1. termina HTTPS (en producción, con el certificado de Let's Encrypt),
 *   2. agrega cabeceras de seguridad (helmet),
 *   3. limita la cantidad de pedidos por IP (100 por minuto),
 *   4. reenvía SOLO /api/v1/* a la API de la red segura.
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const API_URL = process.env.API_INTERNAL_URL || 'http://127.0.0.1:3000'; // la API en la red segura
const PORT = parseInt(process.env.FRONT_PORT || '8080', 10); // desarrollo (HTTP)
const TLS_CERT = process.env.TLS_CERT_PATH; // producción: fullchain.pem de Let's Encrypt
const TLS_KEY = process.env.TLS_KEY_PATH; // producción: privkey.pem
const usaTLS = Boolean(TLS_CERT && TLS_KEY);
const MAX_BODY = 100 * 1024; // 100 KB, igual que la API
// Única excepción: la subida de fotos (POST /api/v1/archivos). La API vuelve a controlar tamaño y tipo.
const MAX_FOTO = 4 * 1024 * 1024;
const esSubidaDeFoto = (req) => req.method === 'POST' && req.path === '/api/v1/archivos';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false); // estamos directamente en Internet: no confiamos en X-Forwarded-For de nadie

// HSTS solo tiene sentido si servimos HTTPS.
app.use(helmet({ hsts: usaTLS ? { maxAge: 31536000, includeSubDomains: true } : false }));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: parseInt(process.env.RATE_LIMIT_POR_MINUTO || '100', 10),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: { code: 'DEMASIADOS_PEDIDOS', message: 'Demasiados pedidos, esperá un momento' } }),
  })
);

// CORS (5.7): la app móvil no lo necesita (es una protección de los navegadores), pero si más adelante
// hay un panel web, solo se permiten los orígenes listados en CORS_ORIGINS (separados por coma). Vacío = ninguno.
const origenesPermitidos = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origen = req.get('origin');
  if (origen && origenesPermitidos.includes(origen)) {
    res.set({
      'Access-Control-Allow-Origin': origen,
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    });
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
});

// Cortamos bodies grandes antes de reenviarlos.
app.use((req, res, next) => {
  const largo = parseInt(req.get('content-length') || '0', 10);
  if (largo > (esSubidaDeFoto(req) ? MAX_FOTO : MAX_BODY)) return res.status(413).json({ error: { code: 'DEMASIADO_GRANDE', message: 'El pedido es demasiado grande' } });
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(
  createProxyMiddleware({
    target: API_URL,
    pathFilter: '/api/v1', // solo se reenvía la API versionada; todo lo demás -> 404
    xfwd: true, // agrega X-Forwarded-For con la IP real del cliente (la API la usa para auditoría y rate limit)
    proxyTimeout: 15000,
    on: {
      error: (err, req, res) => {
        if (res.headersSent) return;
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'API_NO_DISPONIBLE', message: 'El servicio no está disponible, probá más tarde' } }));
      },
    },
  })
);

app.use((req, res) => res.status(404).json({ error: { code: 'RUTA_INEXISTENTE', message: 'La ruta no existe' } }));

if (usaTLS) {
  const credenciales = { cert: fs.readFileSync(TLS_CERT), key: fs.readFileSync(TLS_KEY), minVersion: 'TLSv1.2' };
  https.createServer(credenciales, app).listen(443, () => console.log('Front-service HTTPS en 443 ->', API_URL));
  // El puerto 80 solo redirige a HTTPS (y sirve el desafío de Let's Encrypt si se usa webroot).
  http
    .createServer((req, res) => {
      const host = (req.headers.host || '').split(':')[0];
      res.writeHead(301, { Location: `https://${host}${req.url}` });
      res.end();
    })
    .listen(80, () => console.log('Front-service HTTP 80 -> redirige a HTTPS'));
} else {
  app.listen(PORT, '0.0.0.0', () => console.log(`Front-service (desarrollo, HTTP) en el puerto ${PORT} -> ${API_URL}`));
}
