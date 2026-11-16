/* Sprint 4: fotos, perfil de organización, "Mi historia", cupos ilimitados y calendario.
 Cada bloque prueba la funcionalidad Y sus controles de seguridad (rol, titularidad, organización y ABAC).
 */
const { app, request, conectar, desconectar, escenario, crearActividad, crearUsuario, bearer, models } = require('./helpers');

let s;
beforeAll(async () => {
  await conectar();
  s = await escenario();
});
afterAll(desconectar);

// Una "foto" mínima: alcanza con que empiece con la firma de un JPEG (la API no decodifica la imagen).
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from('JFIF-de-prueba')]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-de-prueba')]);

const subir = (u, uso, cuerpo = JPEG, tipo = 'image/jpeg') =>
  request(app).post(`/api/v1/archivos?uso=${uso}`).set(bearer(u)).set('Content-Type', tipo).send(cuerpo);

async function aceptadaConAsistencia(coord, vol, extra = {}) {
  const act = await crearActividad(coord, extra);
  const ins = await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(vol));
  expect(ins.status).toBe(201);
  expect((await request(app).patch(`/api/v1/inscripciones/${ins.body.id}`).set(bearer(coord)).send({ estado: 'aceptada' })).status).toBe(200);
  expect((await request(app).post(`/api/v1/inscripciones/${ins.body.id}/asistencia-manual`).set(bearer(coord)).send({})).status).toBe(201);
  return act;
}

/** Pasa una actividad al pasado (ya realizada) directo en la base. */
async function terminar(actId) {
  const fin = new Date(Date.now() - 60 * 60 * 1000);
  await models.Actividad.updateOne({ _id: actId }, { $set: { fechaInicio: new Date(fin.getTime() - 3 * 3600 * 1000), fechaFin: fin } });
}

describe('Cupos ilimitados', () => {
  test('una actividad con cupo null no tiene límite de lugares', async () => {
    const act = await crearActividad(s.coordA, { cupo: null });
    expect(act.cupoIlimitado).toBe(true);
    expect(act.cupo).toBeNull();
    expect(act.cuposLibres).toBeNull();
    for (const v of [s.vol1, s.vol2, s.judicial]) {
      expect((await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(v))).status).toBe(201);
    }
    const otra = await crearUsuario();
    expect((await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(otra))).status).toBe(201);
    const res = await request(app).get(`/api/v1/actividades/${act.id}`).set(bearer(s.vol1));
    expect(res.body.inscriptos).toBe(4);
    expect(res.body.cuposLibres).toBeNull();
  });

  test('el cupo hay que mandarlo siempre al crear (número o null), así nadie queda "sin límite" por olvido', async () => {
    const { cupo, ...sinCupo } = { cupo: 1, titulo: 'Sin cupo', descripcion: 'Descripción de prueba', ubicacion: { lat: -34.9, lng: -56.1 }, fechaInicio: new Date(Date.now() + 86400000).toISOString(), fechaFin: new Date(Date.now() + 90000000).toISOString() };
    const res = await request(app).post('/api/v1/actividades').set(bearer(s.coordA)).send(sinCupo);
    expect(res.status).toBe(400);
    expect(cupo).toBe(1);
  });

  test('se puede pasar de ilimitado a un número, pero no por debajo de los inscriptos', async () => {
    const act = await crearActividad(s.coordA, { cupo: null });
    await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(s.vol1));
    await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(s.vol2));
    expect((await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ cupo: 1 })).status).toBe(409);
    const ok = await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ cupo: 2 });
    expect(ok.status).toBe(200);
    expect(ok.body.cuposLibres).toBe(0);
    expect((await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(s.judicial))).status).toBe(409);
    const libre = await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ cupo: null });
    expect(libre.body.cupoIlimitado).toBe(true);
  });
});

describe('Pregunta obligatoria: ¿hay contacto con menores?', () => {
  test('sin responderla no se puede crear la actividad', async () => {
    const { datosActividad } = require('./helpers');
    const { contactoMenores, ...sinRespuesta } = datosActividad();
    expect(contactoMenores).toBe(false);
    expect((await request(app).post('/api/v1/actividades').set(bearer(s.coordA)).send(sinRespuesta)).status).toBe(400);
  });

  test('si la respuesta es sí, un voluntario judicial no la ve ni se puede inscribir', async () => {
    const act = await crearActividad(s.coordA, { titulo: 'Tarde de juegos', contactoMenores: true });
    expect(act.contactoMenores).toBe(true);
    expect((await request(app).get(`/api/v1/actividades/${act.id}`).set(bearer(s.judicial))).status).toBe(403);
    expect((await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(s.judicial))).status).toBe(403);
    expect((await request(app).get(`/api/v1/actividades/${act.id}`).set(bearer(s.vol1))).status).toBe(200);
    const lista = await request(app).get('/api/v1/actividades?limit=50').set(bearer(s.judicial));
    expect(lista.body.data.map((a) => a.id)).not.toContain(act.id);
  });

  test('la etiqueta de menores no se puede sacar "a mano": solo cambiando la respuesta', async () => {
    const act = await crearActividad(s.coordA, { contactoMenores: true });
    const solo = await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ etiquetas: [String(s.etiquetas.normal._id)] });
    expect(solo.body.contactoMenores).toBe(true); // sigue marcada
    const no = await request(app).patch(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA)).send({ contactoMenores: false });
    expect(no.body.contactoMenores).toBe(false);
    expect((await request(app).get(`/api/v1/actividades/${act.id}`).set(bearer(s.judicial))).status).toBe(200);
  });

  test('las características que mande el cliente (Urgente, etc.) se ignoran', async () => {
    const urgente = await models.Etiqueta.create({ nombre: `Urgente-${Date.now()}`, clase: 'caracteristica' });
    const act = await crearActividad(s.coordA, { etiquetas: [String(urgente._id)] });
    expect(act.etiquetas.map((e) => e.id)).not.toContain(String(urgente._id));
  });
});

describe('Tipos de actividad y calendario', () => {
  test('las etiquetas dicen si son tipo o característica, y la actividad trae su tipo', async () => {
    const car = await models.Etiqueta.create({ nombre: `Urgente ${Date.now()}`, clase: 'caracteristica' });
    const act = await crearActividad(s.coordA, { etiquetas: [String(car._id), String(s.etiquetas.normal._id)] });
    expect(act.tipo).toBe(s.etiquetas.normal.nombre); // la característica no cuenta como tipo
    const etiquetas = await request(app).get('/api/v1/etiquetas');
    expect(etiquetas.body.find((e) => e.id === String(car._id)).clase).toBe('caracteristica');
  });

  test('el coordinador pide las actividades de su organización por rango de fechas (calendario)', async () => {
    const lejos = new Date(Date.now() + 60 * 86400000);
    await crearActividad(s.coordA, { titulo: 'Dentro de dos meses', fechaInicio: lejos.toISOString(), fechaFin: new Date(lejos.getTime() + 3600000).toISOString() });
    const desde = new Date(lejos.getTime() - 86400000).toISOString();
    const hasta = new Date(lejos.getTime() + 86400000).toISOString();
    const res = await request(app).get(`/api/v1/actividades?mias=true&desde=${desde}&hasta=${hasta}`).set(bearer(s.coordA));
    expect(res.status).toBe(200);
    expect(res.body.data.map((a) => a.titulo)).toEqual(['Dentro de dos meses']);
  });

  test('mis inscripciones traen el tipo y la organización de la actividad (para el calendario)', async () => {
    const act = await crearActividad(s.coordA, { etiquetas: [String(s.etiquetas.normal._id)] });
    await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(s.vol1));
    const res = await request(app).get('/api/v1/usuarios/me/inscripciones').set(bearer(s.vol1));
    const ins = res.body.data.find((i) => i.actividadId === act.id);
    expect(ins.actividad.tipo).toBe(s.etiquetas.normal.nombre);
    expect(ins.actividad.organizacion.id).toBe(String(s.orgA._id));
  });
});

describe('Fotos (archivos)', () => {
  test('cualquiera sube su foto de perfil y solo su dueño la puede ver', async () => {
    const res = await subir(s.vol1, 'perfil');
    expect(res.status).toBe(201);
    expect(res.body.url).toBe(`/archivos/${res.body.id}`);
    const ver = await request(app).get(`/api/v1/archivos/${res.body.id}`).set(bearer(s.vol1));
    expect(ver.status).toBe(200);
    expect(ver.headers['content-type']).toBe('image/jpeg');
    expect((await request(app).get(`/api/v1/archivos/${res.body.id}`).set(bearer(s.vol2))).status).toBe(403);
    expect((await request(app).get(`/api/v1/archivos/${res.body.id}`)).status).toBe(401);
  });

  test('el tipo se controla por el contenido, no por lo que dice el pedido', async () => {
    expect((await subir(s.vol1, 'perfil', Buffer.from('<script>alert(1)</script>'), 'image/jpeg')).status).toBe(400);
    const png = await subir(s.vol1, 'perfil', PNG, 'application/octet-stream');
    expect(png.status).toBe(201);
    expect((await request(app).get(`/api/v1/archivos/${png.body.id}`).set(bearer(s.vol1))).headers['content-type']).toBe('image/png');
  });

  test('cada tipo de foto la puede subir solo el rol que corresponde', async () => {
    expect((await subir(s.vol1, 'organizacion')).status).toBe(403);
    expect((await subir(s.vol1, 'publicacion')).status).toBe(403);
    expect((await subir(s.coordA, 'historia')).status).toBe(403);
    expect((await subir(s.vol1, 'otra-cosa')).status).toBe(400);
    expect((await subir(s.vol1, 'perfil', Buffer.alloc(0))).status).toBe(400);
  });

  test('una foto de más de 4 MB se rechaza', async () => {
    const enorme = Buffer.concat([JPEG, Buffer.alloc(4 * 1024 * 1024)]);
    expect((await subir(s.vol1, 'perfil', enorme)).status).toBe(413);
  });

  test('foto de perfil: solo se puede usar una propia', async () => {
    const mia = await subir(s.vol2, 'perfil');
    const ok = await request(app).patch('/api/v1/usuarios/me').set(bearer(s.vol2)).send({ fotoId: mia.body.id });
    expect(ok.status).toBe(200);
    expect(ok.body.foto).toBe(`/archivos/${mia.body.id}`);
    const ajena = await request(app).patch('/api/v1/usuarios/me').set(bearer(s.vol1)).send({ fotoId: mia.body.id });
    expect(ajena.status).toBe(400);
    const sacar = await request(app).patch('/api/v1/usuarios/me').set(bearer(s.vol2)).send({ fotoId: null });
    expect(sacar.body.foto).toBeNull();
  });
});

describe('Perfil de organización', () => {
  test('cualquiera con sesión ve el perfil; de los coordinadores solo nombre e inicial', async () => {
    const res = await request(app).get(`/api/v1/organizaciones/${s.orgA._id}`).set(bearer(s.vol1));
    expect(res.status).toBe(200);
    expect(res.body.coordinadores).toEqual([{ nombre: 'Nombre', inicial: 'A' }]);
    const texto = JSON.stringify(res.body);
    expect(texto).not.toMatch(/email|telefono|apellido|099123456/);
    expect((await request(app).get(`/api/v1/organizaciones/${s.orgA._id}`)).status).toBe(401);
  });

  test('una organización dada de baja no se muestra', async () => {
    const baja = await models.Organizacion.create({ nombre: `Baja ${Date.now()}`, activa: false });
    expect((await request(app).get(`/api/v1/organizaciones/${baja._id}`).set(bearer(s.vol1))).status).toBe(404);
  });

  test('el coordinador edita el perfil de SU organización (la organización sale del token)', async () => {
    const logo = await subir(s.coordA, 'organizacion');
    const res = await request(app)
      .patch('/api/v1/organizaciones/mia')
      .set(bearer(s.coordA))
      .send({ descripcion: 'Limpiamos playas', rubro: 'Medioambiente', zona: 'Montevideo', logoId: logo.body.id, nombre: 'Intento de cambiar el nombre' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(String(s.orgA._id));
    expect(res.body.rubro).toBe('Medioambiente');
    expect(res.body.logo).toBe(`/archivos/${logo.body.id}`);
    expect(res.body.nombre).toBe(s.orgA.nombre); // el nombre no se puede cambiar desde acá
    // Las fotos de organización las ve cualquiera con sesión.
    expect((await request(app).get(`/api/v1/archivos/${logo.body.id}`).set(bearer(s.vol1))).status).toBe(200);
  });

  test('un coordinador no puede usar fotos de otra organización ni un voluntario editar', async () => {
    const deB = await subir(s.coordB, 'organizacion');
    expect((await request(app).patch('/api/v1/organizaciones/mia').set(bearer(s.coordA)).send({ portadaId: deB.body.id })).status).toBe(400);
    expect((await request(app).patch('/api/v1/organizaciones/mia').set(bearer(s.vol1)).send({ descripcion: 'x' })).status).toBe(403);
  });

  test('próximas: a un voluntario judicial no le aparecen las actividades sensibles', async () => {
    const sensible = await crearActividad(s.coordB, { titulo: 'Sensible', etiquetas: [String(s.etiquetas.sensible._id)] });
    const normal = await crearActividad(s.coordB, { titulo: 'Normal' });
    const vol = await request(app).get(`/api/v1/organizaciones/${s.orgB._id}/proximas`).set(bearer(s.vol1));
    expect(vol.body.map((a) => a.id)).toEqual(expect.arrayContaining([sensible.id, normal.id]));
    const jud = await request(app).get(`/api/v1/organizaciones/${s.orgB._id}/proximas`).set(bearer(s.judicial));
    expect(jud.body.map((a) => a.id)).toContain(normal.id);
    expect(jud.body.map((a) => a.id)).not.toContain(sensible.id);
  });
});

describe('Publicaciones de la organización', () => {
  test('solo sobre actividades YA realizadas de su organización, con fotos propias', async () => {
    const act = await aceptadaConAsistencia(s.coordA, s.vol1);
    const foto = await subir(s.coordA, 'publicacion');
    const temprano = await request(app).post('/api/v1/organizaciones/mia/publicaciones').set(bearer(s.coordA)).send({ actividadId: act.id, contenido: 'Gracias!', fotos: [foto.body.id] });
    expect(temprano.status).toBe(409); // todavía no terminó

    await terminar(act.id);
    const otraOrg = await request(app).post('/api/v1/organizaciones/mia/publicaciones').set(bearer(s.coordB)).send({ actividadId: act.id, contenido: 'spam' });
    expect(otraOrg.status).toBe(403);
    const fotoAjena = await subir(s.coordB, 'publicacion');
    expect((await request(app).post('/api/v1/organizaciones/mia/publicaciones').set(bearer(s.coordA)).send({ actividadId: act.id, contenido: 'x', fotos: [fotoAjena.body.id] })).status).toBe(400);

    const ok = await request(app).post('/api/v1/organizaciones/mia/publicaciones').set(bearer(s.coordA)).send({ actividadId: act.id, contenido: '¡Gracias a todos!', fotos: [foto.body.id] });
    expect(ok.status).toBe(201);
    expect(ok.body.fotos).toEqual([`/archivos/${foto.body.id}`]);

    const feed = await request(app).get(`/api/v1/organizaciones/${s.orgA._id}/publicaciones`).set(bearer(s.vol2));
    const pub = feed.body.data.find((p) => p.id === ok.body.id);
    expect(pub.actividad.id).toBe(act.id);
    expect(pub.participantes).toBe(1); // voluntarios aceptados en la actividad
    expect(pub.autor).toEqual({ nombre: 'Nombre' });

    const realizadas = await request(app).get('/api/v1/organizaciones/mia/realizadas').set(bearer(s.coordA));
    expect(realizadas.body.find((a) => a.id === act.id).publicada).toBe(true);
  });

  test('a un voluntario judicial no le llegan publicaciones (ni fotos) de actividades sensibles', async () => {
    const act = await crearActividad(s.coordA, { titulo: 'Sensible pasada', etiquetas: [String(s.etiquetas.sensible._id)] });
    await terminar(act.id);
    const foto = await subir(s.coordA, 'publicacion');
    const pub = await request(app).post('/api/v1/organizaciones/mia/publicaciones').set(bearer(s.coordA)).send({ actividadId: act.id, contenido: 'Tarde con los chicos', fotos: [foto.body.id] });
    expect(pub.status).toBe(201);
    const vol = await request(app).get(`/api/v1/organizaciones/${s.orgA._id}/publicaciones`).set(bearer(s.vol1));
    expect(vol.body.data.map((p) => p.id)).toContain(pub.body.id);
    const jud = await request(app).get(`/api/v1/organizaciones/${s.orgA._id}/publicaciones`).set(bearer(s.judicial));
    expect(jud.body.data.map((p) => p.id)).not.toContain(pub.body.id);
    expect((await request(app).get(`/api/v1/archivos/${foto.body.id}`).set(bearer(s.judicial))).status).toBe(403);
    expect((await request(app).get(`/api/v1/archivos/${foto.body.id}`).set(bearer(s.vol1))).status).toBe(200);
  });

  test('el feed de un proyecto también acepta fotos (solo propias)', async () => {
    const act = await crearActividad(s.coordA);
    const foto = await subir(s.coordA, 'publicacion');
    const res = await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordA)).send({ contenido: 'Arrancamos', fotos: [foto.body.id] });
    expect(res.status).toBe(201);
    expect(res.body.fotos).toHaveLength(1);
  });
});

describe('Mi historia', () => {
  test('flujo completo: pendiente -> contar -> sumar fotos', async () => {
    const act = await aceptadaConAsistencia(s.coordA, s.vol2);
    const pend = await request(app).get('/api/v1/historias/pendientes').set(bearer(s.vol2));
    expect(pend.status).toBe(200);
    expect(pend.body.map((a) => a.id)).toContain(act.id);

    const f1 = await subir(s.vol2, 'historia');
    const crear = await request(app).post('/api/v1/historias').set(bearer(s.vol2)).send({ actividadId: act.id, relato: 'Juntamos 40 bolsas', fotos: [f1.body.id] });
    expect(crear.status).toBe(201);
    expect(crear.body.relato).toBe('Juntamos 40 bolsas');
    expect(crear.body.actividad.titulo).toBe(act.titulo);
    expect(crear.body.organizacion.id).toBe(String(s.orgA._id));

    expect((await request(app).post('/api/v1/historias').set(bearer(s.vol2)).send({ actividadId: act.id })).status).toBe(409);
    const pend2 = await request(app).get('/api/v1/historias/pendientes').set(bearer(s.vol2));
    expect(pend2.body.map((a) => a.id)).not.toContain(act.id);

    const f2 = await subir(s.vol2, 'historia');
    const sumar = await request(app).patch(`/api/v1/historias/${crear.body.id}`).set(bearer(s.vol2)).send({ fotos: [...crear.body.fotoIds, f2.body.id] });
    expect(sumar.status).toBe(200);
    expect(sumar.body.fotos).toHaveLength(2);

    const mias = await request(app).get('/api/v1/historias').set(bearer(s.vol2));
    expect(mias.body.map((h) => h.id)).toContain(crear.body.id);
  });

  test('no se puede contar una actividad a la que no fuiste', async () => {
    const act = await crearActividad(s.coordA);
    const res = await request(app).post('/api/v1/historias').set(bearer(s.vol1)).send({ actividadId: act.id, relato: 'Fui (mentira)' });
    expect(res.status).toBe(403);
  });

  test('nadie ve ni edita la historia ni las fotos de otra persona', async () => {
    const act = await aceptadaConAsistencia(s.coordB, s.vol1);
    const foto = await subir(s.vol1, 'historia');
    const h = await request(app).post('/api/v1/historias').set(bearer(s.vol1)).send({ actividadId: act.id, relato: 'Mío', fotos: [foto.body.id] });
    expect(h.status).toBe(201);
    expect((await request(app).patch(`/api/v1/historias/${h.body.id}`).set(bearer(s.vol2)).send({ relato: 'hackeado' })).status).toBe(403);
    expect((await request(app).get(`/api/v1/archivos/${foto.body.id}`).set(bearer(s.vol2))).status).toBe(403);
    expect((await request(app).get(`/api/v1/archivos/${foto.body.id}`).set(bearer(s.coordB))).status).toBe(403);
    const otras = await request(app).get('/api/v1/historias').set(bearer(s.vol2));
    expect(otras.body.map((x) => x.id)).not.toContain(h.body.id);
    // Tampoco se pueden "robar" fotos ajenas para una historia propia.
    const act2 = await aceptadaConAsistencia(s.coordB, s.vol2);
    expect((await request(app).post('/api/v1/historias').set(bearer(s.vol2)).send({ actividadId: act2.id, fotos: [foto.body.id] })).status).toBe(400);
  });

  test('con la asistencia sin validar todavía no se puede contar; validada, sí', async () => {
    const act = await crearActividad(s.coordB);
    const otra = await crearUsuario();
    const ins = await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(otra));
    await request(app).patch(`/api/v1/inscripciones/${ins.body.id}`).set(bearer(s.coordB)).send({ estado: 'aceptada' });
    // Asistencia registrada pero abierta (como cuando escanea el QR).
    const asis = await models.Asistencia.create({ inscripcionId: ins.body.id, actividadId: act.id, voluntarioId: otra.usuario._id, organizacionId: s.orgB._id, checkIn: new Date(), metodo: 'qr' });

    const mias = await request(app).get('/api/v1/usuarios/me/inscripciones').set(bearer(otra));
    expect(mias.body.data.find((i) => i.id === ins.body.id).asistencia).toBe('abierta'); // la app muestra "esperando validación"
    expect((await request(app).get('/api/v1/historias/pendientes').set(bearer(otra))).body).toEqual([]);
    expect((await request(app).post('/api/v1/historias').set(bearer(otra)).send({ actividadId: act.id })).status).toBe(409);

    expect((await request(app).patch(`/api/v1/asistencias/${asis._id}/validar`).set(bearer(s.coordB))).status).toBe(200);
    const mias2 = await request(app).get('/api/v1/usuarios/me/inscripciones').set(bearer(otra));
    expect(mias2.body.data.find((i) => i.id === ins.body.id).asistencia).toBe('validada');
    expect((await request(app).get('/api/v1/historias/pendientes').set(bearer(otra))).body.map((a) => a.id)).toContain(act.id);
    expect((await request(app).post('/api/v1/historias').set(bearer(otra)).send({ actividadId: act.id })).status).toBe(201);
  });

  test('solo los voluntarios tienen "Mi historia"', async () => {
    expect((await request(app).get('/api/v1/historias').set(bearer(s.coordA))).status).toBe(403);
    expect((await request(app).get('/api/v1/historias').set(bearer(s.admin))).status).toBe(403);
  });
});

describe('Un solo tipo por actividad y actividades canceladas', () => {
  test('si llegan varios tipos, la actividad queda solo con el primero', async () => {
    const tipos = await models.Etiqueta.find({ clase: 'tipo' }).limit(2).lean();
    expect(tipos.length).toBe(2);
    const act = await crearActividad(s.coordA, { etiquetas: tipos.map((t) => String(t._id)) });
    const guardada = await models.Actividad.findById(act.id).lean();
    expect(guardada.etiquetas.map(String)).toEqual([String(tipos[0]._id)]);
  });

  test('cuando el coordinador cancela la actividad, deja de aparecer en Mis inscripciones del voluntario', async () => {
    const vol = await crearUsuario();
    const act = await crearActividad(s.coordA);
    expect((await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(vol))).status).toBe(201);
    let mias = await request(app).get('/api/v1/usuarios/me/inscripciones').set(bearer(vol));
    expect(mias.body.data.some((i) => i.actividadId === act.id)).toBe(true);

    expect((await request(app).delete(`/api/v1/actividades/${act.id}`).set(bearer(s.coordA))).status).toBeLessThan(300);
    mias = await request(app).get('/api/v1/usuarios/me/inscripciones').set(bearer(vol));
    expect(mias.body.data.some((i) => i.actividadId === act.id)).toBe(false);
  });
});

describe('Novedades vs. perfil de la organización', () => {
  test('una novedad de la actividad no aparece en el perfil, y lo del perfil no aparece en Novedades', async () => {
    const act = await crearActividad(s.coordA);
    await terminar(act.id);
    const nov = await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordA)).send({ contenido: 'Novedad pública de prueba' });
    expect(nov.status).toBe(201);
    const foto = await subir(s.coordA, 'publicacion');
    const perfil = await request(app).post('/api/v1/organizaciones/mia/publicaciones').set(bearer(s.coordA)).send({ actividadId: act.id, contenido: 'Fotos del día', fotos: [foto.body.id] });
    expect(perfil.status).toBe(201);

    const feedOrg = await request(app).get(`/api/v1/organizaciones/${s.orgA._id}/publicaciones`).set(bearer(s.vol1));
    const idsOrg = feedOrg.body.data.map((p) => p.id);
    expect(idsOrg).toContain(perfil.body.id);
    expect(idsOrg).not.toContain(nov.body.id);

    const novedades = await request(app).get(`/api/v1/proyectos/${act.id}/publicaciones`);
    const idsNov = novedades.body.data.map((p) => p.id);
    expect(idsNov).toContain(nov.body.id);
    expect(idsNov).not.toContain(perfil.body.id);
  });

  test('ya no se crean "convocatorias": aunque manden tipo, se guarda como novedad común', async () => {
    const act = await crearActividad(s.coordA);
    const res = await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordA)).send({ tipo: 'convocatoria', contenido: 'x' });
    expect(res.status).toBe(201);
    const guardada = await models.Publicacion.findById(res.body.id).lean();
    expect(guardada.tipo).toBe('post');
    expect(guardada.destino).toBe('novedad');
  });
});
