/**
 * Utilidades para los tests. Por defecto levantan un MongoDB en memoria (mongodb-memory-server),
 * así no hace falta Atlas ni Docker para correr "npm test".
 * La primera vez descarga el binario de MongoDB (~100 MB), después queda en caché.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const crearApp = require('../app');
const models = require('../src/models');
const { firmarAccessToken } = require('../src/services/token.service');

let memoria;
const app = crearApp();

async function conectar() {
  let uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoria = await MongoMemoryServer.create();
    uri = memoria.getUri();
  }
  const base = `test_${crypto.randomBytes(4).toString('hex')}`;
  // runtimeAdapters: el driver 7 carga "os" con import() dinámico, que Jest (CommonJS) no soporta;
  // sin esto el handshake sale sin metadatos y Mongo rechaza la conexión.
  await mongoose.connect(uri, { dbName: base, runtimeAdapters: { os: require('os') } });
  for (const m of Object.values(models)) {
    try {
      await m.syncIndexes();
    } catch (e) {
      // Algunos motores de prueba no soportan índices geoespaciales; no afecta a estos tests.
    }
  }
}

async function desconectar() {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (memoria) await memoria.stop();
}

const unico = () => crypto.randomBytes(4).toString('hex');

async function crearOrganizacion(extra = {}) {
  return models.Organizacion.create({ nombre: `Org ${unico()}`, activa: true, ...extra });
}

async function crearUsuario({ rol = 'voluntario', organizacionId = null, esJudicial = false, password = 'Password123', ...extra } = {}) {
  const u = await models.Usuario.create({
    nombre: 'Nombre',
    apellido: 'Apellido',
    email: `${rol}-${unico()}@test.com`,
    telefono: '099123456',
    passwordHash: await bcrypt.hash(password, 4),
    rol,
    organizacionId,
    esJudicial,
    horasAsignadas: esJudicial ? 30 : 0,
    ...extra,
  });
  return { usuario: u, token: firmarAccessToken(u._id), password };
}

/** Arma un escenario: 2 organizaciones con su coordinador, 2 voluntarios, 1 judicial, admin y etiquetas. */
async function escenario() {
  const orgA = await crearOrganizacion();
  const orgB = await crearOrganizacion();
  const coordA = await crearUsuario({ rol: 'coordinador', organizacionId: orgA._id });
  const coordB = await crearUsuario({ rol: 'coordinador', organizacionId: orgB._id });
  const vol1 = await crearUsuario();
  const vol2 = await crearUsuario();
  const judicial = await crearUsuario({ esJudicial: true });
  const admin = await crearUsuario({ rol: 'admin' });
  const normal = await models.Etiqueta.create({ nombre: `Medioambiente ${unico()}`, sensible: false });
  const sensible = await models.Etiqueta.create({ nombre: `Contacto con menores ${unico()}`, sensible: true });
  return { orgA, orgB, coordA, coordB, vol1, vol2, judicial, admin, etiquetas: { normal, sensible } };
}

function datosActividad(extra = {}) {
  const inicio = new Date(Date.now() - 30 * 60 * 1000); // empezó hace 30 min (sirve para probar el QR)
  const fin = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return {
    titulo: 'Limpieza de playa Ramírez',
    descripcion: 'Juntamos residuos en la playa, traer guantes.',
    etiquetas: [],
    ubicacion: { lat: -34.91, lng: -56.17 },
    direccion: 'Playa Ramírez, Montevideo',
    fechaInicio: inicio.toISOString(),
    fechaFin: fin.toISOString(),
    cupo: 20,
    ...extra,
  };
}

async function crearActividad(coord, extra = {}) {
  const res = await request(app).post('/api/v1/actividades').set('Authorization', `Bearer ${coord.token}`).send(datosActividad(extra));
  if (res.status !== 201) throw new Error(`No se pudo crear la actividad: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });

module.exports = { app, request, conectar, desconectar, crearOrganizacion, crearUsuario, escenario, datosActividad, crearActividad, bearer, models };
