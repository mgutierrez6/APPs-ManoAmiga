/* Chat de la actividad y avisos de la campanita (Sprint 5).
 Quién entra al chat, solo lectura, moderación y que los avisos le lleguen a quien corresponde (y a nadie más).
 */
const { app, request, conectar, desconectar, escenario, crearActividad, crearUsuario, bearer, models } = require('./helpers');

let s;
beforeAll(async () => {
  await conectar();
  s = await escenario();
});
afterAll(desconectar);

const DIA = 24 * 3600 * 1000;

async function inscribir(vol, actId) {
  const ins = await request(app).post(`/api/v1/actividades/${actId}/inscripciones`).set(bearer(vol));
  expect(ins.status).toBe(201);
  return ins.body;
}
const aceptar = (coord, insId, estado = 'aceptada') => request(app).patch(`/api/v1/inscripciones/${insId}`).set(bearer(coord)).send({ estado });
const leer = (u, actId, q = '') => request(app).get(`/api/v1/actividades/${actId}/mensajes${q}`).set(bearer(u));
const escribir = (u, actId, texto) => request(app).post(`/api/v1/actividades/${actId}/mensajes`).set(bearer(u)).send({ texto });
const avisos = (u) => request(app).get('/api/v1/usuarios/me/notificaciones').set(bearer(u));

/** Actividad de la org A con un voluntario aceptado y otro pendiente. */
async function armar() {
  const act = await crearActividad(s.coordA);
  const aceptado = await crearUsuario();
  const pendiente = await crearUsuario();
  const ins = await inscribir(aceptado, act.id);
  expect((await aceptar(s.coordA, ins.id)).status).toBe(200);
  await inscribir(pendiente, act.id);
  return { act, aceptado, pendiente };
}

describe('Chat: quién puede entrar', () => {
  test('el voluntario aceptado y el coordinador de la org leen y escriben', async () => {
    const { act, aceptado } = await armar();
    expect((await escribir(aceptado, act.id, 'Hola, ¿llevo guantes?')).status).toBe(201);
    expect((await escribir(s.coordA, act.id, 'Sí, y agua')).status).toBe(201);

    const res = await leer(aceptado, act.id);
    expect(res.status).toBe(200);
    expect(res.body.puedeEscribir).toBe(true);
    expect(res.body.data.map((m) => m.texto)).toEqual(['Hola, ¿llevo guantes?', 'Sí, y agua']);
    expect(res.body.data[0].mio).toBe(true);
    expect(res.body.data[1].autor.esCoordinador).toBe(true);
    // No se filtran datos personales del autor
    expect(res.body.data[0].autor).toEqual({ nombre: 'Nombre', esCoordinador: false });
  });

  test('un inscripto pendiente no entra (403)', async () => {
    const { act, pendiente } = await armar();
    expect((await leer(pendiente, act.id)).status).toBe(403);
    expect((await escribir(pendiente, act.id, 'hola')).status).toBe(403);
  });

  test('un voluntario no inscripto no entra aunque sepa el id (403)', async () => {
    const { act } = await armar();
    expect((await leer(s.vol1, act.id)).status).toBe(403);
    expect((await escribir(s.vol1, act.id, 'hola')).status).toBe(403);
  });

  test('un coordinador de otra organización no entra (RS3)', async () => {
    const { act } = await armar();
    const res = await leer(s.coordB, act.id);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('OTRA_ORGANIZACION');
  });

  test('el admin no entra (matriz)', async () => {
    const { act } = await armar();
    expect((await leer(s.admin, act.id)).status).toBe(403);
  });

  test('si al voluntario lo rechazan, deja de ver el chat', async () => {
    const act = await crearActividad(s.coordA);
    const vol = await crearUsuario();
    const ins = await inscribir(vol, act.id);
    await aceptar(s.coordA, ins.id);
    expect((await leer(vol, act.id)).status).toBe(200);
    expect((await aceptar(s.coordA, ins.id, 'rechazada')).status).toBe(200);
    expect((await leer(vol, act.id)).status).toBe(403);
  });

  test('ABAC: un judicial aceptado pierde el acceso si la actividad pasa a ser sensible', async () => {
    const act = await crearActividad(s.coordA);
    const ins = await inscribir(s.judicial, act.id);
    await aceptar(s.coordA, ins.id);
    expect((await leer(s.judicial, act.id)).status).toBe(200);
    await models.Actividad.updateOne({ _id: act.id }, { $push: { etiquetas: s.etiquetas.sensible._id } });
    expect((await leer(s.judicial, act.id)).status).toBe(403);
  });
});

describe('Chat: mensajes, solo lectura y moderación', () => {
  test('?despues= devuelve solo los mensajes nuevos', async () => {
    const { act, aceptado } = await armar();
    const primero = (await escribir(aceptado, act.id, 'uno')).body;
    await new Promise((r) => setTimeout(r, 5));
    await escribir(s.coordA, act.id, 'dos');
    const res = await leer(aceptado, act.id, `?despues=${encodeURIComponent(primero.fecha)}`);
    expect(res.body.data.map((m) => m.texto)).toEqual(['dos']);
  });

  test('texto vacío o de más de 1000 caracteres -> 400', async () => {
    const { act, aceptado } = await armar();
    expect((await escribir(aceptado, act.id, '   ')).status).toBe(400);
    expect((await escribir(aceptado, act.id, 'a'.repeat(1001))).status).toBe(400);
  });

  test('actividad cancelada: se lee pero no se escribe', async () => {
    const { act, aceptado } = await armar();
    await escribir(aceptado, act.id, 'antes de cancelar');
    expect((await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA))).status).toBeLessThan(300);
    const res = await leer(aceptado, act.id);
    expect(res.status).toBe(200);
    expect(res.body.puedeEscribir).toBe(false);
    const w = await escribir(aceptado, act.id, 'después');
    expect(w.status).toBe(409);
    expect(w.body.error.code).toBe('CHAT_CERRADO');
  });

  test('terminó hace más de 7 días: solo lectura; hace 2 días: todavía se escribe', async () => {
    const { act, aceptado } = await armar();
    await models.Actividad.updateOne({ _id: act.id }, { $set: { fechaInicio: new Date(Date.now() - 3 * DIA), fechaFin: new Date(Date.now() - 2 * DIA) } });
    expect((await escribir(aceptado, act.id, 'gracias a todos')).status).toBe(201);
    await models.Actividad.updateOne({ _id: act.id }, { $set: { fechaInicio: new Date(Date.now() - 9 * DIA), fechaFin: new Date(Date.now() - 8 * DIA) } });
    expect((await escribir(aceptado, act.id, 'hola?')).status).toBe(409);
    expect((await leer(aceptado, act.id)).body.data.length).toBe(1);
  });

  test('cada uno borra los suyos; no puede borrar los de otro', async () => {
    const { act, aceptado } = await armar();
    const otro = await crearUsuario();
    const ins = await inscribir(otro, act.id);
    await aceptar(s.coordA, ins.id);
    const m = (await escribir(aceptado, act.id, 'me equivoqué')).body;
    expect(m.puedoBorrar).toBe(true);
    expect((await request(app).delete(`/api/v1/mensajes/${m.id}`).set(bearer(otro))).status).toBe(403);
    expect((await request(app).delete(`/api/v1/mensajes/${m.id}`).set(bearer(aceptado))).status).toBe(204);
    const lista = (await leer(otro, act.id)).body.data;
    expect(lista[0]).toMatchObject({ borrado: true, texto: null });
  });

  test('el coordinador de la org modera; el de otra org no', async () => {
    const { act, aceptado } = await armar();
    const m = (await escribir(aceptado, act.id, 'mensaje fuera de lugar')).body;
    expect((await request(app).delete(`/api/v1/mensajes/${m.id}`).set(bearer(s.coordB))).status).toBe(403);
    expect((await request(app).delete(`/api/v1/mensajes/${m.id}`).set(bearer(s.coordA))).status).toBe(204);
    const guardado = await models.Mensaje.findById(m.id).lean();
    expect(guardado.borrado).toBe(true);
    expect(String(guardado.borradoPor)).toBe(String(s.coordA.usuario._id));
  });

  test('límite de 20 mensajes por minuto', async () => {
    const { act, aceptado } = await armar();
    for (let i = 0; i < 20; i++) expect((await escribir(aceptado, act.id, `m${i}`)).status).toBe(201);
    expect((await escribir(aceptado, act.id, 'uno más')).status).toBe(429);
  });
});

describe('Avisos de la campanita', () => {
  test('al aceptar o rechazar, el voluntario recibe el aviso (y nadie más)', async () => {
    const act = await crearActividad(s.coordA);
    const a = await crearUsuario();
    const b = await crearUsuario();
    await aceptar(s.coordA, (await inscribir(a, act.id)).id);
    await aceptar(s.coordA, (await inscribir(b, act.id)).id, 'rechazada');

    const deA = (await avisos(a)).body;
    expect(deA.sinLeer).toBe(1);
    expect(deA.data[0]).toMatchObject({ tipo: 'inscripcion_aceptada', actividadId: act.id, leida: false });
    expect((await avisos(b)).body.data[0].tipo).toBe('inscripcion_rechazada');
    expect((await avisos(s.vol1)).body.data.some((n) => n.actividadId === act.id)).toBe(false);
  });

  test('cancelar avisa a pendientes y aceptados', async () => {
    const { act, aceptado, pendiente } = await armar();
    await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA));
    for (const u of [aceptado, pendiente]) {
      expect((await avisos(u)).body.data.some((n) => n.tipo === 'actividad_cancelada' && n.actividadId === act.id)).toBe(true);
    }
  });

  test('cambiar la fecha avisa; cambiar solo la descripción no', async () => {
    const { act, aceptado } = await armar();
    await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ descripcion: 'Nueva descripción más larga' });
    expect((await avisos(aceptado)).body.data.some((n) => n.tipo === 'actividad_cambiada')).toBe(false);
    const fin = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    expect((await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ fechaFin: fin })).status).toBe(200);
    const n = (await avisos(aceptado)).body.data.find((x) => x.tipo === 'actividad_cambiada');
    expect(n.texto).toMatch(/la fecha/);
  });

  test('una novedad avisa a los inscriptos de la actividad', async () => {
    const { act, aceptado, pendiente } = await armar();
    expect((await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordA)).send({ contenido: 'Nos vemos en la entrada' })).status).toBe(201);
    for (const u of [aceptado, pendiente]) {
      expect((await avisos(u)).body.data.some((n) => n.tipo === 'novedad' && n.actividadId === act.id)).toBe(true);
    }
    expect((await avisos(s.vol2)).body.data.some((n) => n.actividadId === act.id)).toBe(false);
  });

  test('los mensajes del chat se agrupan en un solo aviso y se marcan leídos al abrir el chat', async () => {
    const { act, aceptado, pendiente } = await armar();
    await escribir(s.coordA, act.id, 'uno');
    await escribir(s.coordA, act.id, 'dos');
    await escribir(s.coordA, act.id, 'tres');

    let chat = (await avisos(aceptado)).body.data.filter((n) => n.tipo === 'chat');
    expect(chat).toHaveLength(1);
    expect(chat[0].texto).toBe('3 mensajes nuevos en el chat');
    // el pendiente no está en el chat: no recibe avisos del chat
    expect((await avisos(pendiente)).body.data.some((n) => n.tipo === 'chat')).toBe(false);
    // el autor no se avisa a sí mismo
    expect((await avisos(s.coordA)).body.data.some((n) => n.tipo === 'chat' && n.actividadId === act.id)).toBe(false);

    await leer(aceptado, act.id);
    chat = (await avisos(aceptado)).body.data.filter((n) => n.tipo === 'chat');
    expect(chat[0].leida).toBe(true);

    // un mensaje después abre un aviso nuevo
    await escribir(s.coordA, act.id, 'cuatro');
    chat = (await avisos(aceptado)).body.data.filter((n) => n.tipo === 'chat' && !n.leida);
    expect(chat).toHaveLength(1);
    expect(chat[0].texto).toBe('1 mensaje nuevo en el chat');
  });

  test('sin-leer, marcar uno y leer todas', async () => {
    const { act, aceptado } = await armar();
    await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordA)).send({ contenido: 'Novedad' });
    let n = (await request(app).get('/api/v1/usuarios/me/notificaciones/sin-leer').set(bearer(aceptado))).body.sinLeer;
    expect(n).toBe(2); // aceptada + novedad

    const primero = (await avisos(aceptado)).body.data[0];
    expect((await request(app).patch(`/api/v1/notificaciones/${primero.id}/leida`).set(bearer(aceptado))).status).toBe(200);
    n = (await request(app).get('/api/v1/usuarios/me/notificaciones/sin-leer').set(bearer(aceptado))).body.sinLeer;
    expect(n).toBe(1);

    expect((await request(app).post('/api/v1/usuarios/me/notificaciones/leer-todas').set(bearer(aceptado))).body.marcadas).toBe(1);
    expect((await request(app).get('/api/v1/usuarios/me/notificaciones/sin-leer').set(bearer(aceptado))).body.sinLeer).toBe(0);
  });

  test('nadie puede marcar como leído el aviso de otra persona (RS2)', async () => {
    const { aceptado } = await armar();
    const suyo = (await avisos(aceptado)).body.data[0];
    const res = await request(app).patch(`/api/v1/notificaciones/${suyo.id}/leida`).set(bearer(s.vol1));
    expect(res.status).toBe(403);
    expect((await models.Notificacion.findById(suyo.id).lean()).leida).toBe(false);
  });
});
