/* R5 Mapa interactivo,  RS7 (solo ubicaciones institucionales),  ABAC en un endpoint público.
 */
const { app, request, conectar, desconectar, escenario, crearActividad, bearer, models } = require('./helpers');

let s;
let normal;
let sensible;
let campana;
beforeAll(async () => {
  await conectar();
  s = await escenario();
  normal = await crearActividad(s.coordA, { titulo: 'Plantación de árboles', etiquetas: [String(s.etiquetas.normal._id)] });
  sensible = await crearActividad(s.coordA, { titulo: 'Apoyo escolar', etiquetas: [String(s.etiquetas.sensible._id)] });
  campana = await models.Campana.create({
    organizacionId: s.orgA._id,
    creadaPor: s.coordA.usuario._id,
    titulo: 'Abrigo para el invierno',
    descripcion: 'Juntamos ropa de abrigo.',
    puntos: [{ nombre: 'Sede central', direccion: 'Av. 18 de Julio 1234', ubicacion: { type: 'Point', coordinates: [-56.18, -34.9] } }],
    fechaInicio: new Date(Date.now() - 86400000),
    fechaFin: new Date(Date.now() + 7 * 86400000),
  });
});
afterAll(desconectar);

const puntos = (query = '', u) => {
  const r = request(app).get(`/api/v1/mapa/puntos${query}`);
  return u ? r.set(bearer(u)) : r;
};
const titulos = (res) => res.body.data.map((p) => p.titulo);

describe('R5 · puntos del mapa', () => {
  test('es público y trae actividades y puntos de acopio', async () => {
    const res = await puntos('', s.vol1);
    expect(res.status).toBe(200);
    expect(titulos(res)).toEqual(expect.arrayContaining(['Plantación de árboles', 'Apoyo escolar', 'Sede central']));
    const acopio = res.body.data.find((p) => p.tipo === 'acopio');
    expect(acopio).toMatchObject({ campana: 'Abrigo para el invierno', ubicacion: { lat: -34.9, lng: -56.18 } });
  });

  test('filtro por tipo', async () => {
    const act = await puntos('?tipo=actividad', s.vol1);
    expect(act.body.data.every((p) => p.tipo === 'actividad')).toBe(true);
    const acopio = await puntos('?tipo=acopio', s.vol1);
    expect(acopio.body.data.every((p) => p.tipo === 'acopio')).toBe(true);
  });

  test('filtro por etiqueta y por campaña', async () => {
    const porEtiqueta = await puntos(`?etiqueta=${s.etiquetas.normal._id}`, s.vol1);
    expect(titulos(porEtiqueta)).toEqual(['Plantación de árboles']);
    const porCampana = await puntos(`?campana=${campana._id}`, s.vol1);
    expect(titulos(porCampana)).toEqual(['Sede central']);
  });

  test('las actividades canceladas no aparecen', async () => {
    const cancelada = await crearActividad(s.coordA, { titulo: 'Se suspendió' });
    await request(app).delete(`/api/v1/actividades/${cancelada.id}`).set(bearer(s.coordA));
    expect(titulos(await puntos('', s.vol1))).not.toContain('Se suspendió');
  });

  test('datos inválidos -> 400', async () => {
    expect((await puntos('?tipo=casas')).status).toBe(400);
    expect((await puntos('?lat=-34.9')).status).toBe(400); // lat sin lng
  });
});

describe('ABAC en el mapa', () => {
  test('un voluntario judicial NO ve actividades sensibles', async () => {
    const res = await puntos('', s.judicial);
    expect(titulos(res)).toContain('Plantación de árboles');
    expect(titulos(res)).not.toContain('Apoyo escolar');
  });

  test('anónimo (sin sesión o con token inválido): tampoco se muestran las sensibles', async () => {
    expect(titulos(await puntos())).not.toContain('Apoyo escolar');
    const tokenRoto = await request(app).get('/api/v1/mapa/puntos').set('Authorization', 'Bearer roto');
    expect(tokenRoto.status).toBe(200);
    expect(titulos(tokenRoto)).not.toContain('Apoyo escolar');
  });
});

describe('RS7 · solo ubicaciones institucionales', () => {
  test('ningún punto trae datos de personas', async () => {
    const res = await puntos('', s.vol1);
    const permitidos = ['id', 'tipo', 'titulo', 'organizacion', 'etiquetas', 'ubicacion', 'direccion', 'fechaInicio', 'fechaFin', 'cuposLibres', 'campana', 'campanaId'];
    for (const p of res.body.data) {
      expect(Object.keys(p).every((k) => permitidos.includes(k))).toBe(true);
    }
    expect(JSON.stringify(res.body)).not.toContain(s.vol1.usuario.email);
    expect(JSON.stringify(res.body)).not.toContain('099123456');
  });

  test('la ubicación del actividad es la que cargó el coordinador', async () => {
    const res = await puntos('', s.vol1);
    const p = res.body.data.find((x) => x.id === normal.id);
    expect(p.ubicacion).toEqual(normal.ubicacion);
    expect(sensible.ubicacion).toBeTruthy();
  });
});
