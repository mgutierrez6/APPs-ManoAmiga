// Carga y valida las variables de entorno (5.6 Manejo de secretos).
// Ningún secreto se escribe en el código: todos vienen del archivo .env (que NO se sube a Git)
// o de las variables del servidor.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';
const esTest = NODE_ENV === 'test';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisá tu archivo .env (copialo de .env.example).`);
  }
  return valor;
}

function secreto(nombre) {
  const valor = requerida(nombre);
  // Un secreto corto se puede adivinar por fuerza bruta: exigimos al menos 32 caracteres.
  if (!esTest && valor.length < 32) {
    throw new Error(`${nombre} debe tener al menos 32 caracteres. Generalo con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
  }
  return valor;
}

const config = {
  nodeEnv: NODE_ENV,
  esTest,
  esProduccion: NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '3000', 10),
  // En desarrollo la API solo escucha en la propia compu: el celular entra SIEMPRE por el front-service.
  // En Docker se pone HOST=0.0.0.0 (la red interna de Docker hace de firewall).
  host: process.env.HOST || '127.0.0.1',
  mongoUri: esTest ? process.env.MONGO_URI || '' : requerida('MONGO_URI'),
  jwtSecret: secreto('JWT_SECRET'),
  jwtRefreshSecret: secreto('JWT_REFRESH_SECRET'),
  qrSecret: secreto('QR_SECRET'),
  accessTokenTtl: '15m',
  refreshTokenDias: 7,
  qrTtlSegundos: 60,
  bcryptCosto: esTest ? 4 : 12, // en los tests bajamos el costo solo para que corran rápido
  jwtIssuer: 'mano-amiga-api',
  jwtAudience: 'mano-amiga-app',
  // Cantidad de proxies delante de la API (el front-service). Así req.ip es la IP real del cliente.
  trustProxy: parseInt(process.env.TRUST_PROXY || '1', 10),
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN || '',
  // Carpeta donde se guardan las fotos subidas (perfil, organización, publicaciones, historias).
  // En Docker es un volumen (ver docker-compose.yml). En el futuro se puede cambiar por S3 sin tocar las pantallas.
  uploadsDir: process.env.UPLOADS_DIR || path.resolve(__dirname, '../../uploads'),
  // Tamaño máximo de cada foto. La app las achica antes de subirlas (~300 KB), así que 4 MB es holgado.
  maxFotoBytes: 4 * 1024 * 1024,
};

module.exports = config;
