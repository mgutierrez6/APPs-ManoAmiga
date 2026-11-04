/* Correcciones nuevas de Seguridad (las pensamos luego de la entrega del informe):
 RS-18 : cancelar / reactivar solo cambian el cupo si cambia el estado (pedidos simultáneos).
 RS-19 : ABAC también al registrar asistencia (QR y manual).
 RS-20 : no se acreditan horas de actividades futuras o canceladas.
 */
const { app, request, conectar, desconectar, escenario, crearActividad, crearUsuario, bearer, models } = require('./helpers');

let s;
beforeAll(async () => {
  await conectar();
  s = await escenario();
});
afterAll(desconectar);

const inscribir = (vol, actId) => request(app).post(`/api/v1/actividades/${actId}/inscripciones`).set(bearer(vol));
const aceptar = (insId) => request(app).patch(`/api/v1/inscripciones/${insId}`).set(bearer(s.coordA)).send({ estado: 'aceptada' });
const manual = (insId, body = {}) => request(app).post(`/api/v1/inscripciones/${insId}/asistencia-manual`).set(bearer(s.coordA)).send(body);
const inscriptos = async (actId) => (await models.Actividad.findById(actId)).inscriptos;

describe('RS-18 · el cupo no se descuenta dos veces', () => {
  test('dos "cancelar" simultáneos liberan UN solo cupo', async () => {
    const act = await crearActividad(s.coordA);
    const otro = await crearUsuario();
    await inscribir(otro, act.id);
    const ins = (await inscribir(s.vol1, act.id)).body;
    expect(await inscriptos(act.id)).toBe(2);

    const [a, b] = await Promise.all([
      request(app).delete(`/api/v1/inscripciones/${ins.id}`).set(bearer(s.vol1)),
      request(app).delete(`/api/v1/inscripciones/${ins.id}`).set(bearer(s.vol1)),
    ]);
    expect([a.status, b.status].sort()).toEqual([204, 409]);
    expect(await inscriptos(act.id)).toBe(1);
  });

  test('dos "reinscribirme" simultáneos después de cancelar ocupan UN solo cupo', async () => {
    const act = await crearActividad(s.coordA);
    const ins = (await inscribir(s.vol2, act.id)).body;
    await request(app).delete(`/api/v1/inscripciones/${ins.id}`).set(bearer(s.vol2));
    expect(await inscriptos(act.id)).toBe(0);

    const [a, b] = await Promise.all([inscribir(s.vol2, act.id), inscribir(s.vol2, act.id)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await inscriptos(act.id)).toBe(1);
  });
});

describe('RS-19 · ABAC al registrar asistencia', () => {
  // Se inscribe siendo voluntario común y DESPUÉS lo marcan como judicial.
  async function inscriptoQueSeVuelveJudicial(act) {
    const vol = await crearUsuario();
    const ins = (await inscribir(vol, act.id)).body;
    await aceptar(ins.id);
    await models.Usuario.updateOne({ _id: vol.usuario._id }, { $set: { esJudicial: true, horasAsignadas: 20 } });
    return { vol, ins };
  }

  test('check-in con QR en una actividad sensible -> 403', async () => {
    const act = await crearActividad(s.coordA, { etiquetas: [String(s.etiquetas.sensible._id)] });
    const { vol } = await inscriptoQueSeVuelveJudicial(act);
    const qr = (await request(app).get(`/api/v1/actividades/${act.id}/qr`).set(bearer(s.coordA))).body.qr;
    const res = await request(app).post(`/api/v1/actividades/${act.id}/asistencias`).set(bearer(vol)).send({ qr });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACTIVIDAD_RESTRINGIDA');
  });

  test('asistencia manual de un judicial en una actividad sensible -> 403 (aunque la registre el coordinador)', async () => {
    const act = await crearActividad(s.coordA, { etiquetas: [String(s.etiquetas.sensible._id)] });
    const { ins } = await inscriptoQueSeVuelveJudicial(act);
    const res = await manual(ins.id, { horas: 1 });
    expect(res.status).toBe(403);
    expect(await models.Asistencia.exists({ inscripcionId: ins.id })).toBeFalsy();
  });

  test('en una actividad NO sensible el judicial sí puede registrar asistencia', async () => {
    const act = await crearActividad(s.coordA, { etiquetas: [String(s.etiquetas.normal._id)] });
    const { ins } = await inscriptoQueSeVuelveJudicial(act);
    expect((await manual(ins.id, { horas: 1 })).status).toBe(201);
  });
});

describe('RS-20 · no se acreditan horas de actividades futuras o canceladas', () => {
  test('asistencia manual en una actividad que todavía no empezó -> 409', async () => {
    const manana = Date.now() + 24 * 60 * 60 * 1000;
    const act = await crearActividad(s.coordA, { fechaInicio: new Date(manana).toISOString(), fechaFin: new Date(manana + 3600000).toISOString() });
    const ins = (await inscribir(s.vol1, act.id)).body;
    await aceptar(ins.id);
    const res = await manual(ins.id, { horas: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVIDAD_NO_EMPEZO');
  });

  test('asistencia manual en una actividad cancelada -> 409', async () => {
    const act = await crearActividad(s.coordA);
    const ins = (await inscribir(s.vol2, act.id)).body;
    await aceptar(ins.id);
    await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA));
    const res = await manual(ins.id, { horas: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVIDAD_CANCELADA');
  });

  test('validar un check-in de una actividad que después se canceló -> 409', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await crearUsuario();
    const ins = (await inscribir(vol, act.id)).body;
    await aceptar(ins.id);
    const qr = (await request(app).get(`/api/v1/actividades/${act.id}/qr`).set(bearer(s.coordA))).body.qr;
    const asis = (await request(app).post(`/api/v1/actividades/${act.id}/asistencias`).set(bearer(vol)).send({ qr })).body;
    await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA));

    const res = await request(app).patch(`/api/v1/asistencias/${asis.id}/validar`).set(bearer(s.coordA));
    expect(res.status).toBe(409);
    expect((await models.Asistencia.findById(asis.id)).estado).toBe('abierta');
  });
});
