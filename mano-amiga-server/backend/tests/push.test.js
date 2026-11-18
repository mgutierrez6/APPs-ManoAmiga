/* Notificaciones push: qué se le manda a Expo, a quién y qué pasa si falla.
 No sale nada a Internet: se reemplaza fetch y se mira lo que la API le habría enviado a Expo Push.
 */
const { app, request, conectar, desconectar, escenario, crearActividad, crearUsuario, bearer, models } = require('./helpers');
const config = require('../src/config/env');
const logger = require('../src/utils/logger');
const { notificar, esPushTokenValido } = require('../src/services/notificacion.service');

const EXPO = 'https://exp.host/--/api/v2/push/send';
let s;
let n = 0;
let envio;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const nuevoToken = () => `ExponentPushToken[prueba${++n}]`;

/** Todos los mensajes que se le mandaron a Expo hasta ahora. */
const mensajes = () => envio.mock.calls.flatMap(([, op]) => JSON.parse(op.body));
const paraTodo = (token) => mensajes().filter((m) => m.to === token);
// "Nueva actividad" y "Nueva inscripción" salen de fondo y pueden llegar en cualquier momento:
// se dejan afuera para que no se mezclen con lo que mide cada test.
const DE_FONDO = ['Nueva actividad', 'Nueva inscripción'];
const para = (token) => paraTodo(token).filter((m) => !DE_FONDO.includes(m.title));
const nuevaActividad = (token, actividadId) => paraTodo(token).filter((m) => m.title === 'Nueva actividad' && m.data.actividadId === actividadId);

async function esperar(condicion) {
  for (let i = 0; i < 100; i++) {
    if (condicion()) return;
    await dormir(20);
  }
  throw new Error(`No llegó lo esperado. Mensajes: ${JSON.stringify(mensajes())}`);
}

async function conToken(extra) {
  const u = await crearUsuario(extra);
  u.push = nuevoToken();
  expect((await request(app).post('/api/v1/usuarios/me/push-token').set(bearer(u)).send({ token: u.push })).status).toBe(204);
  return u;
}

const inscribir = async (vol, actId) => (await request(app).post(`/api/v1/actividades/${actId}/inscripciones`).set(bearer(vol))).body;
const decidir = (coord, insId, estado) => request(app).patch(`/api/v1/inscripciones/${insId}`).set(bearer(coord)).send({ estado });
const escribir = (u, actId, texto) => request(app).post(`/api/v1/actividades/${actId}/mensajes`).set(bearer(u)).send({ texto });

async function aceptado(actId) {
  const vol = await conToken();
  const ins = await inscribir(vol, actId);
  expect((await decidir(s.coordA, ins.id, 'aceptada')).status).toBe(200);
  await esperar(() => para(vol.push).length === 1);
  envio.mockClear();
  return vol;
}

beforeAll(async () => {
  await conectar();
  s = await escenario();
  s.coordA.push = nuevoToken();
  await request(app).post('/api/v1/usuarios/me/push-token').set(bearer(s.coordA)).send({ token: s.coordA.push });
});
afterAll(desconectar);

beforeEach(() => {
  config.esTest = false; // en los tests el envío está apagado: acá se prende, con fetch simulado
  envio = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 });
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
});
afterEach(async () => {
  await dormir(30); // deja terminar los envíos que no se esperan
  config.esTest = true;
  config.expoAccessToken = '';
  jest.restoreAllMocks();
});

describe('Envío a Expo Push', () => {
  test('manda título, texto y datos a Expo, solo a tokens válidos', async () => {
    const u = await crearUsuario();
    await models.Usuario.updateOne({ _id: u.usuario._id }, { $set: { pushTokens: ['ExponentPushToken[bueno]', 'token-roto'] } });
    await notificar(u.usuario._id, 'Título', 'Texto', { tipo: 'chat' });
    expect(envio).toHaveBeenCalledTimes(1);
    expect(envio.mock.calls[0][0]).toBe(EXPO);
    expect(mensajes()).toEqual([{ to: 'ExponentPushToken[bueno]', sound: 'default', title: 'Título', body: 'Texto', data: { tipo: 'chat' } }]);
  });

  test('reconoce los dos formatos de token de Expo y rechaza el resto', () => {
    expect(esPushTokenValido('ExponentPushToken[abc-_1]')).toBe(true);
    expect(esPushTokenValido('ExpoPushToken[abc]')).toBe(true);
    for (const malo of ['', 'abc', 'ExponentPushToken[]', 'ExponentPushToken[a b]', null, 5]) expect(esPushTokenValido(malo)).toBe(false);
  });

  test('sin dispositivos registrados no llama a Expo', async () => {
    const u = await crearUsuario();
    await notificar(u.usuario._id, 'T', 'C');
    expect(envio).not.toHaveBeenCalled();
  });

  test('manda de a 100 mensajes por pedido', async () => {
    const u = await crearUsuario();
    await models.Usuario.updateOne({ _id: u.usuario._id }, { $set: { pushTokens: Array.from({ length: 105 }, (_, i) => `ExponentPushToken[lote${i}]`) } });
    await notificar(u.usuario._id, 'T', 'C');
    expect(envio.mock.calls.map(([, op]) => JSON.parse(op.body).length)).toEqual([100, 5]);
  });

  test('usa el token de acceso de Expo solo si está configurado', async () => {
    const u = await conToken();
    await notificar(u.usuario._id, 'T', 'C');
    expect(envio.mock.calls[0][1].headers.Authorization).toBeUndefined();
    config.expoAccessToken = 'secreto';
    await notificar(u.usuario._id, 'T', 'C');
    expect(envio.mock.calls[1][1].headers.Authorization).toBe('Bearer secreto');
  });

  test('si Expo falla o responde error, no se rompe y queda registrado', async () => {
    const u = await conToken();
    envio.mockRejectedValueOnce(new Error('sin red'));
    await expect(notificar(u.usuario._id, 'T', 'C')).resolves.toBeUndefined();
    envio.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(notificar(u.usuario._id, 'T', 'C')).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});

describe('Registro de dispositivos', () => {
  test('registrar dos veces el mismo no lo duplica, y se guardan hasta 5', async () => {
    const u = await crearUsuario();
    const registrar = (token) => request(app).post('/api/v1/usuarios/me/push-token').set(bearer(u)).send({ token });
    await registrar('ExponentPushToken[repetido]');
    await registrar('ExponentPushToken[repetido]');
    for (let i = 0; i < 6; i++) await registrar(`ExponentPushToken[d${i}]`);
    const { pushTokens } = await models.Usuario.findById(u.usuario._id).select('+pushTokens').lean();
    expect(pushTokens).toEqual(['d1', 'd2', 'd3', 'd4', 'd5'].map((d) => `ExponentPushToken[${d}]`));
  });
});

describe('Qué evento manda push y a quién', () => {
  test('aceptar: le llega al voluntario, con datos para abrir la actividad y sin datos personales', async () => {
    const act = await crearActividad(s.coordA, { titulo: 'Olla del Cerro' });
    const vol = await conToken();
    const otro = await conToken();
    const ins = await inscribir(vol, act.id);
    envio.mockClear();
    await decidir(s.coordA, ins.id, 'aceptada');
    await esperar(() => para(vol.push).length === 1);
    const [m] = para(vol.push);
    expect(m).toMatchObject({ title: '¡Te aceptaron!', data: { tipo: 'inscripcion_aceptada', actividadId: act.id } });
    expect(m.body).toContain('Olla del Cerro');
    const texto = JSON.stringify(m);
    for (const dato of [vol.usuario.email, vol.usuario.telefono, vol.usuario.apellido]) expect(texto).not.toContain(dato);
    expect(para(otro.push)).toHaveLength(0);
  });

  test('rechazar: le llega el aviso de rechazo', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await conToken();
    const ins = await inscribir(vol, act.id);
    envio.mockClear();
    await decidir(s.coordA, ins.id, 'rechazada');
    await esperar(() => para(vol.push).length === 1);
    expect(para(vol.push)[0].data.tipo).toBe('inscripcion_rechazada');
  });

  test('si Expo está caído, aceptar funciona igual y el aviso queda en la campanita', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await conToken();
    const ins = await inscribir(vol, act.id);
    envio.mockRejectedValue(new Error('Expo caído'));
    expect((await decidir(s.coordA, ins.id, 'aceptada')).status).toBe(200);
    const avisos = (await request(app).get('/api/v1/usuarios/me/notificaciones').set(bearer(vol))).body;
    expect(avisos.data[0].tipo).toBe('inscripcion_aceptada');
  });

  test('chat: un push por grupo de mensajes, y otro después de abrir el chat', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await aceptado(act.id);
    const pendiente = await conToken();
    await inscribir(pendiente, act.id);
    envio.mockClear();

    for (const t of ['uno', 'dos', 'tres']) expect((await escribir(s.coordA, act.id, t)).status).toBe(201);
    await esperar(() => para(vol.push).length >= 1);
    await dormir(60);
    expect(para(vol.push)).toHaveLength(1);
    expect(para(vol.push)[0]).toMatchObject({ body: '1 mensaje nuevo en el chat', data: { tipo: 'chat', actividadId: act.id } });
    expect(JSON.stringify(para(vol.push)[0])).not.toMatch(/uno|dos|tres/); // el contenido del chat no viaja en el push
    expect(para(pendiente.push)).toHaveLength(0);
    expect(para(s.coordA.push)).toHaveLength(0); // quien escribe no se avisa a sí mismo

    await request(app).get(`/api/v1/actividades/${act.id}/mensajes`).set(bearer(vol));
    await escribir(s.coordA, act.id, 'cuatro');
    await esperar(() => para(vol.push).length === 2);
  });

  test('chat: si escribe el voluntario, le llega al coordinador', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await aceptado(act.id);
    await escribir(vol, act.id, 'hola');
    await esperar(() => para(s.coordA.push).length === 1);
    expect(para(vol.push)).toHaveLength(0);
  });

  test('novedad y cancelación: les llega a pendientes y aceptados, no a otros', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await aceptado(act.id);
    const pendiente = await conToken();
    const ajeno = await conToken();
    await inscribir(pendiente, act.id);
    envio.mockClear();

    await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordA)).send({ contenido: 'Cambió el punto de encuentro' });
    await esperar(() => para(vol.push).length === 1 && para(pendiente.push).length === 1);
    expect(para(vol.push)[0].data.tipo).toBe('novedad');

    await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA));
    await esperar(() => para(vol.push).length === 2 && para(pendiente.push).length === 2);
    expect(para(vol.push)[1].data.tipo).toBe('actividad_cancelada');
    expect(para(ajeno.push)).toHaveLength(0);
  });

  test.each([
    ['la fecha', () => ({ fechaFin: new Date(Date.now() + 5 * 3600000).toISOString() })],
    ['el lugar', () => ({ direccion: 'Otra dirección 123' })],
    ['el lugar', () => ({ ubicacion: { lat: -34.8, lng: -56.1 } })],
    ['la fecha y el lugar', () => ({ fechaFin: new Date(Date.now() + 6 * 3600000).toISOString(), direccion: 'Otra 456' })],
  ])('si cambia %s, avisa a los inscriptos', async (que, cambios) => {
    const act = await crearActividad(s.coordA);
    const vol = await aceptado(act.id);
    expect((await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send(cambios())).status).toBe(200);
    await esperar(() => para(vol.push).length === 1);
    expect(para(vol.push)[0].body).toBe(`Cambió ${que}. Revisá los datos antes de ir.`);
  });

  test('editar sin cambiar fecha ni lugar no manda push', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await aceptado(act.id);
    await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ descripcion: 'Una descripción nueva y más larga' });
    await dormir(100);
    expect(para(vol.push)).toHaveLength(0);
  });

  test('actividad nueva: avisa a los voluntarios, también a un judicial si no es sensible', async () => {
    const comun = await conToken();
    const judicial = await conToken({ esJudicial: true });
    const act = await crearActividad(s.coordA, { titulo: 'Plantada de árboles' });
    await esperar(() => nuevaActividad(comun.push, act.id).length === 1 && nuevaActividad(judicial.push, act.id).length === 1);
  });

  test('inscribirse: le avisa a los coordinadores de la organización', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await conToken();
    await inscribir(vol, act.id);
    const llego = () => paraTodo(s.coordA.push).filter((m) => m.title === 'Nueva inscripción' && m.data.actividadId === act.id);
    await esperar(() => llego().length === 1);
  });

  test('ABAC: de una actividad sensible no se le avisa a un voluntario judicial', async () => {
    const comun = await conToken();
    const judicial = await conToken({ esJudicial: true });
    const act = await crearActividad(s.coordA, { titulo: 'Tarde con niños', contactoMenores: true });
    await esperar(() => nuevaActividad(comun.push, act.id).length === 1);
    expect(nuevaActividad(judicial.push, act.id)).toHaveLength(0);
  });
});

describe('Casos borde de chat y avisos', () => {
  test('actividad o mensaje inexistente -> 404', async () => {
    const falso = '64b7f0c2a1b2c3d4e5f60718';
    expect((await request(app).get(`/api/v1/actividades/${falso}/mensajes`).set(bearer(s.coordA))).status).toBe(404);
    expect((await request(app).delete(`/api/v1/mensajes/${falso}`).set(bearer(s.coordA))).status).toBe(404);
    expect((await request(app).patch(`/api/v1/notificaciones/${falso}/leida`).set(bearer(s.vol1))).status).toBe(404);
  });

  test('puedoBorrar: lo propio siempre; lo ajeno solo el coordinador; lo borrado, nadie', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await aceptado(act.id);
    const m = (await escribir(s.coordA, act.id, 'aviso')).body;
    const verVol = async () => (await request(app).get(`/api/v1/actividades/${act.id}/mensajes`).set(bearer(vol))).body.data[0];
    expect((await verVol()).puedoBorrar).toBe(false);
    const propio = (await escribir(vol, act.id, 'mío')).body;
    const lista = (await request(app).get(`/api/v1/actividades/${act.id}/mensajes`).set(bearer(s.coordA))).body.data;
    expect(lista.find((x) => x.id === propio.id).puedoBorrar).toBe(true);

    expect((await request(app).delete(`/api/v1/mensajes/${m.id}`).set(bearer(s.coordA))).status).toBe(204);
    expect((await request(app).delete(`/api/v1/mensajes/${m.id}`).set(bearer(s.coordA))).status).toBe(204); // repetir no rompe
    expect(await verVol()).toMatchObject({ borrado: true, texto: null, puedoBorrar: false });
  });

  test('marcar dos veces el mismo aviso como leído no da error', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await aceptado(act.id);
    const [aviso] = (await request(app).get('/api/v1/usuarios/me/notificaciones').set(bearer(vol))).body.data;
    for (let i = 0; i < 2; i++) {
      const r = await request(app).patch(`/api/v1/notificaciones/${aviso.id}/leida`).set(bearer(vol));
      expect(r.status).toBe(200);
      expect(r.body.leida).toBe(true);
    }
  });

  test('la lista de avisos solo trae los propios y respeta el límite', async () => {
    const a = await crearUsuario();
    const b = await crearUsuario();
    await models.Notificacion.insertMany(Array.from({ length: 3 }, (_, i) => ({ usuarioId: a.usuario._id, tipo: 'novedad', titulo: `T${i}`, texto: 'x' })));
    expect((await request(app).get('/api/v1/usuarios/me/notificaciones').set(bearer(b))).body).toEqual({ data: [], sinLeer: 0 });
    const r = await request(app).get('/api/v1/usuarios/me/notificaciones?limit=2').set(bearer(a));
    expect(r.body.data).toHaveLength(2);
    expect(r.body.sinLeer).toBe(3);
  });
});
