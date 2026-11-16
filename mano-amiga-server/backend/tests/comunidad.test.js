const { app, request, conectar, desconectar, escenario, crearActividad, bearer } = require('./helpers');

let s;
beforeAll(async () => {
  await conectar();
  s = await escenario();
});
afterAll(desconectar);

const campana = () => ({
  titulo: 'Colecta de abrigo',
  descripcion: 'Juntamos abrigo para el invierno.',
  objetivo: '200 prendas',
  puntos: [{ nombre: 'Sede central', direccion: '18 de Julio 1234', ubicacion: { lat: -34.9, lng: -56.18 } }],
  fechaInicio: new Date().toISOString(),
  fechaFin: new Date(Date.now() + 7 * 86400000).toISOString(),
});

describe('Campañas y feed (R6)', () => {
  test('el coordinador publica una campaña de su organización', async () => {
    const res = await request(app).post('/api/v1/campanas').set(bearer(s.coordA)).send(campana());
    expect(res.status).toBe(201);
    expect(res.body.organizacion.id).toBe(String(s.orgA._id));
  });

  test('un voluntario no puede publicar campañas', async () => {
    const res = await request(app).post('/api/v1/campanas').set(bearer(s.vol1)).send(campana());
    expect(res.status).toBe(403);
  });

  test('el listado de campañas es público (RS8) y no expone datos personales', async () => {
    const res = await request(app).get('/api/v1/campanas');
    expect(res.status).toBe(200);
    const texto = JSON.stringify(res.body);
    expect(texto).not.toMatch(/email|telefono|apellido|esJudicial/);
  });

  test('feed: el coordinador publica en su proyecto; otro coordinador no puede', async () => {
    const act = await crearActividad(s.coordA);
    const ok = await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordA)).send({ contenido: '¡Necesitamos 3 personas más!' });
    expect(ok.status).toBe(201);
    const no = await request(app).post(`/api/v1/proyectos/${act.id}/publicaciones`).set(bearer(s.coordB)).send({ contenido: 'spam' });
    expect(no.status).toBe(403);

    const feed = await request(app).get(`/api/v1/proyectos/${act.id}/publicaciones`);
    expect(feed.status).toBe(200);
    expect(feed.body.data).toHaveLength(1);
    expect(feed.body.data[0].autor).toEqual({ nombre: 'Nombre' });
  });

  test('feed de un proyecto inexistente -> 404', async () => {
    const res = await request(app).get('/api/v1/proyectos/64b7f0c2a1b2c3d4e5f60718/publicaciones');
    expect(res.status).toBe(404);
  });
});
