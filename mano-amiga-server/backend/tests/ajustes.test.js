/* Ajustes del rediseño (16/11): horario del QR, tipos (un solo tipo, "Animales"), actividades canceladas
 y estado de asistencia en "Mis inscripciones". Cada test prueba la regla en la API, no solo en la app.
 */
const { app, request, conectar, desconectar, escenario, crearActividad, crearUsuario, bearer, models } = require('./helpers');

let s;
beforeAll(async () => {
  await conectar();
  s = await escenario();
});
afterAll(desconectar);

const HORA = 60 * 60 * 1000;
const enHoras = (h) => new Date(Date.now() + h * HORA).toISOString();

/** Inscribe a un voluntario y el coordinador lo acepta. Devuelve la inscripción. */
async function aceptado(coord, vol, actId) {
  const ins = await request(app).post(`/api/v1/actividades/${actId}/inscripciones`).set(bearer(vol));
  expect(ins.status).toBe(201);
  expect((await request(app).patch(`/api/v1/inscripciones/${ins.body.id}`).set(bearer(coord)).send({ estado: 'aceptada' })).status).toBe(200);
  return ins.body;
}

const pedirQR = (coord, actId) => request(app).get(`/api/v1/actividades/${actId}/qr`).set(bearer(coord));
const misInscripciones = (vol) => request(app).get('/api/v1/usuarios/me/inscripciones').set(bearer(vol));

describe('Horario del QR de asistencia: desde 1 h antes del inicio hasta 2 h después del fin', () => {
  test('1 h y media antes del inicio todavía no se puede mostrar el QR', async () => {
    const act = await crearActividad(s.coordA, { fechaInicio: enHoras(1.5), fechaFin: enHoras(4) });
    const res = await pedirQR(s.coordA, act.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FUERA_DE_HORARIO');
  });

  test('media hora antes del inicio ya se puede mostrar el QR y el voluntario aceptado lo escanea', async () => {
    const act = await crearActividad(s.coordA, { fechaInicio: enHoras(0.5), fechaFin: enHoras(3) });
    const vol = await crearUsuario();
    await aceptado(s.coordA, vol, act.id);
    const qr = await pedirQR(s.coordA, act.id);
    expect(qr.status).toBe(200);
    const esc = await request(app).post(`/api/v1/actividades/${act.id}/asistencias`).set(bearer(vol)).send({ qr: qr.body.qr });
    expect(esc.status).toBe(201);
  });

  test('más de 2 h después del fin ya no se puede', async () => {
    const act = await crearActividad(s.coordA);
    await models.Actividad.updateOne({ _id: act.id }, { $set: { fechaInicio: new Date(Date.now() - 6 * HORA), fechaFin: new Date(Date.now() - 3 * HORA) } });
    const res = await pedirQR(s.coordA, act.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FUERA_DE_HORARIO');
  });

  test('la asistencia manual no se puede registrar antes de que empiece la actividad (RS-20)', async () => {
    const act = await crearActividad(s.coordA, { fechaInicio: enHoras(0.5), fechaFin: enHoras(3) });
    const vol = await crearUsuario();
    const ins = await aceptado(s.coordA, vol, act.id);
    const res = await request(app).post(`/api/v1/inscripciones/${ins.id}/asistencia-manual`).set(bearer(s.coordA)).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVIDAD_NO_EMPEZO');
  });
});

describe('Tipos de actividad', () => {
  test('"Animales" y "Otros" existen siempre como tipos', async () => {
    const res = await request(app).get('/api/v1/etiquetas').set(bearer(s.vol1));
    expect(res.status).toBe(200);
    const porNombre = Object.fromEntries(res.body.map((e) => [e.nombre, e]));
    expect(porNombre.Animales).toBeDefined();
    expect(porNombre.Otros).toBeDefined();
    expect(porNombre.Animales.clase).toBe('tipo');
    expect(porNombre.Otros.clase).toBe('tipo');
  });

  test('al editar, si mandan varios tipos queda uno solo', async () => {
    await request(app).get('/api/v1/etiquetas').set(bearer(s.vol1)); // asegura que existan Animales y Otros
    const tipos = await models.Etiqueta.find({ clase: 'tipo', nombre: { $in: ['Animales', 'Otros'] } }).lean();
    const act = await crearActividad(s.coordA);
    const res = await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ etiquetas: tipos.map((t) => String(t._id)) });
    expect(res.status).toBe(200);
    const guardada = await models.Actividad.findById(act.id).lean();
    expect(guardada.etiquetas.map(String)).toEqual([String(tipos[0]._id)]);
  });

  test('una actividad sin tipo queda en "Otros"', async () => {
    const act = await crearActividad(s.coordA, { etiquetas: [] });
    expect(act.tipo).toBe('Otros');
  });
});

describe('Actividades canceladas y estado de asistencia en Mis inscripciones', () => {
  test('mis inscripciones dice si la asistencia está abierta (esperando validación) o validada', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await crearUsuario();
    await aceptado(s.coordA, vol, act.id);

    let mia = (await misInscripciones(vol)).body.data.find((i) => i.actividadId === act.id);
    expect(mia.asistencia).toBeNull();

    const qr = (await pedirQR(s.coordA, act.id)).body.qr;
    expect((await request(app).post(`/api/v1/actividades/${act.id}/asistencias`).set(bearer(vol)).send({ qr })).status).toBe(201);
    mia = (await misInscripciones(vol)).body.data.find((i) => i.actividadId === act.id);
    expect(mia.asistencia).toBe('abierta');

    const asis = (await request(app).get(`/api/v1/actividades/${act.id}/asistencias`).set(bearer(s.coordA))).body.find((a) => a.inscripcionId === mia.id);
    expect((await request(app).patch(`/api/v1/asistencias/${asis.id}/validar`).set(bearer(s.coordA))).status).toBe(200);
    mia = (await misInscripciones(vol)).body.data.find((i) => i.actividadId === act.id);
    expect(mia.asistencia).toBe('validada');
  });

  test('si la organización cancela la actividad, desaparece aunque el voluntario ya tuviera asistencia', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await crearUsuario();
    const ins = await aceptado(s.coordA, vol, act.id);
    expect((await request(app).post(`/api/v1/inscripciones/${ins.id}/asistencia-manual`).set(bearer(s.coordA)).send({})).status).toBe(201);
    expect((await misInscripciones(vol)).body.data.some((i) => i.actividadId === act.id)).toBe(true);

    expect((await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA))).status).toBeLessThan(300);
    expect((await misInscripciones(vol)).body.data.some((i) => i.actividadId === act.id)).toBe(false);
  });

  test('otro coordinador no puede cancelar una actividad ajena (RS3)', async () => {
    const act = await crearActividad(s.coordA);
    const res = await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordB));
    expect(res.status).toBe(403);
    expect((await models.Actividad.findById(act.id).lean()).estado).toBe('publicada');
  });
});
