/* R7 : Administración, R10 (horas para el admin), RS5 (revocación), RS9 (reauth + auditoría).
 */
const { app, request, conectar, desconectar, escenario, crearUsuario, crearActividad, bearer, models } = require('./helpers');

let s;
beforeAll(async () => {
  await conectar();
  s = await escenario();
});
afterAll(desconectar);

const reauth = async (admin = s.admin) => {
  const res = await request(app).post('/api/v1/auth/reauth').set(bearer(admin)).send({ password: admin.password });
  return res.body.reauthToken;
};
const comoAdmin = async (admin = s.admin) => ({ ...bearer(admin), 'X-Reauth-Token': await reauth(admin) });

// Hace login de verdad (para tener un refresh token y probar que la sesión se revoca).
const login = async (u) => (await request(app).post('/api/v1/auth/login').send({ email: u.usuario.email, password: u.password })).body;

describe('RS9 · reautenticación del administrador', () => {
  test('con la contraseña correcta devuelve un token de 5 minutos', async () => {
    const res = await request(app).post('/api/v1/auth/reauth').set(bearer(s.admin)).send({ password: s.admin.password });
    expect(res.status).toBe(200);
    expect(res.body.reauthToken).toBeTruthy();
    const minutos = (new Date(res.body.expiraEn) - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(4);
    expect(minutos).toBeLessThanOrEqual(5);
  });

  test('con la contraseña incorrecta -> 401 y queda auditado', async () => {
    const res = await request(app).post('/api/v1/auth/reauth').set(bearer(s.admin)).send({ password: 'incorrecta' });
    expect(res.status).toBe(401);
    expect(await models.Auditoria.exists({ usuarioId: s.admin.usuario._id, accion: 'reauth', resultado: 'fallo' })).toBeTruthy();
  });

  test('una acción de admin SIN reauth -> 403 REAUTH_REQUERIDA (aunque el rol sea admin)', async () => {
    const res = await request(app).post('/api/v1/admin/organizaciones').set(bearer(s.admin)).send({ nombre: 'Sin reauth' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REAUTH_REQUERIDA');
  });

  test('el token de reauth de OTRO admin no sirve', async () => {
    const otroAdmin = await crearUsuario({ rol: 'admin' });
    const res = await request(app)
      .post('/api/v1/admin/organizaciones')
      .set({ ...bearer(s.admin), 'X-Reauth-Token': await reauth(otroAdmin) })
      .send({ nombre: 'Token ajeno' });
    expect(res.status).toBe(403);
  });

  test('un access token no sirve como token de reauth', async () => {
    const res = await request(app)
      .post('/api/v1/admin/organizaciones')
      .set({ ...bearer(s.admin), 'X-Reauth-Token': s.admin.token })
      .send({ nombre: 'Access como reauth' });
    expect(res.status).toBe(403);
  });
});

describe('R7 · organizaciones', () => {
  test('alta: 201, queda activa y auditada', async () => {
    const res = await request(app).post('/api/v1/admin/organizaciones').set(await comoAdmin()).send({ nombre: 'Fundación Nueva', contacto: 'hola@nueva.org', convenioOSLA: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: 'Fundación Nueva', activa: true, convenioOSLA: true, coordinadores: 0 });
    expect(await models.Auditoria.exists({ accion: 'organizacion_alta', recursoId: res.body.id })).toBeTruthy();
  });

  test('nombre repetido (sin importar mayúsculas) -> 409', async () => {
    const res = await request(app).post('/api/v1/admin/organizaciones').set(await comoAdmin()).send({ nombre: 'fundación nueva' });
    expect(res.status).toBe(409);
  });

  test('el listado incluye la cantidad de coordinadores', async () => {
    const res = await request(app).get('/api/v1/admin/organizaciones').set(bearer(s.admin));
    expect(res.status).toBe(200);
    const orgA = res.body.data.find((o) => o.id === String(s.orgA._id));
    expect(orgA.coordinadores).toBe(1);
  });
});

describe('RS5 · baja de una organización: el acceso se pierde al instante', () => {
  test('el coordinador queda sin acceso, su refresh token no sirve y sus actividades se cancelan', async () => {
    const org = await models.Organizacion.create({ nombre: 'Org a dar de baja', activa: true });
    const coord = await crearUsuario({ rol: 'coordinador', organizacionId: org._id });
    const sesion = await login(coord);
    const act = await crearActividad(coord);
    expect((await request(app).get('/api/v1/usuarios/me').set(bearer(coord))).status).toBe(200);

    const inicio = Date.now();
    const baja = await request(app).delete(`/api/v1/admin/organizaciones/${org._id}`).set(await comoAdmin());
    expect(baja.status).toBe(204);

    // Siguiente pedido con el MISMO access token -> 401 (mucho antes de 1 minuto)
    const despues = await request(app).get('/api/v1/usuarios/me').set(bearer(coord));
    expect(despues.status).toBe(401);
    expect(Date.now() - inicio).toBeLessThan(60 * 1000);

    // Y no puede renovar la sesión
    const refresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: sesion.refreshToken });
    expect(refresh.status).toBe(401);

    expect((await models.Actividad.findById(act.id)).estado).toBe('cancelada');
    expect(await models.Auditoria.exists({ accion: 'organizacion_baja', recursoId: String(org._id) })).toBeTruthy();
  });

  test('dar de baja dos veces -> 409', async () => {
    const org = await models.Organizacion.create({ nombre: 'Ya inactiva', activa: false });
    const res = await request(app).delete(`/api/v1/admin/organizaciones/${org._id}`).set(await comoAdmin());
    expect(res.status).toBe(409);
  });
});

describe('R7 · coordinadores', () => {
  test('un voluntario pasa a coordinador de una organización', async () => {
    const vol = await crearUsuario();
    const res = await request(app)
      .post('/api/v1/admin/coordinadores')
      .set(await comoAdmin())
      .send({ usuarioId: String(vol.usuario._id), organizacionId: String(s.orgB._id) });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rol: 'coordinador', organizacion: { id: String(s.orgB._id) } });
  });

  test('un voluntario judicial NO puede ser coordinador -> 409', async () => {
    const res = await request(app)
      .post('/api/v1/admin/coordinadores')
      .set(await comoAdmin())
      .send({ usuarioId: String(s.judicial.usuario._id), organizacionId: String(s.orgA._id) });
    expect(res.status).toBe(409);
  });

  test('RS5 · al quitarle el rol pierde los permisos de coordinador en el siguiente pedido y sus sesiones se cierran', async () => {
    const coord = await crearUsuario({ rol: 'coordinador', organizacionId: s.orgA._id });
    const sesion = await login(coord);
    expect((await request(app).get('/api/v1/actividades?mias=true').set(bearer(coord))).status).toBe(200);

    const res = await request(app).delete(`/api/v1/admin/coordinadores/${coord.usuario._id}`).set(await comoAdmin());
    expect(res.status).toBe(204);

    // Mismo access token: ahora es voluntario -> 403 en una acción de coordinador
    const crear = await request(app).post('/api/v1/actividades').set(bearer(coord)).send({});
    expect(crear.status).toBe(403);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: sesion.refreshToken })).status).toBe(401);
    expect(await models.Sesion.countDocuments({ userId: coord.usuario._id })).toBe(0);
  });

  test('el listado de usuarios filtra por rol y por texto, y no expone el teléfono', async () => {
    const res = await request(app).get('/api/v1/admin/usuarios?rol=coordinador').set(bearer(s.admin));
    expect(res.status).toBe(200);
    expect(res.body.data.every((u) => u.rol === 'coordinador')).toBe(true);
    expect(res.body.data[0].telefono).toBeUndefined();

    const porEmail = await request(app).get(`/api/v1/admin/usuarios?buscar=${encodeURIComponent(s.vol1.usuario.email)}`).set(bearer(s.admin));
    expect(porEmail.body.data.map((u) => u.id)).toEqual([String(s.vol1.usuario._id)]);
  });
});

describe('R10 · programa judicial', () => {
  test('marcar a un voluntario como judicial exige las horas', async () => {
    const vol = await crearUsuario();
    const sinHoras = await request(app).patch(`/api/v1/admin/voluntarios/${vol.usuario._id}/judicial`).set(await comoAdmin()).send({ esJudicial: true });
    expect(sinHoras.status).toBe(400);

    const res = await request(app).patch(`/api/v1/admin/voluntarios/${vol.usuario._id}/judicial`).set(await comoAdmin()).send({ esJudicial: true, horasAsignadas: 40 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ esJudicial: true, horasAsignadas: 40 });
  });

  test('ABAC · al pasar a judicial se cancela su inscripción a una actividad sensible y se libera el cupo', async () => {
    const vol = await crearUsuario();
    const act = await crearActividad(s.coordA, { etiquetas: [String(s.etiquetas.sensible._id)] });
    await request(app).post(`/api/v1/actividades/${act.id}/inscripciones`).set(bearer(vol));
    expect((await models.Actividad.findById(act.id)).inscriptos).toBe(1);

    await request(app).patch(`/api/v1/admin/voluntarios/${vol.usuario._id}/judicial`).set(await comoAdmin()).send({ esJudicial: true, horasAsignadas: 10 });

    const ins = await models.Inscripcion.findOne({ actividadId: act.id, voluntarioId: vol.usuario._id });
    expect(ins.estado).toBe('cancelada');
    expect((await models.Actividad.findById(act.id)).inscriptos).toBe(0);
  });

  test('las horas cumplidas se calculan solo con asistencias VALIDADAS', async () => {
    const base = { actividadId: s.orgA._id, organizacionId: s.orgA._id, voluntarioId: s.judicial.usuario._id, checkIn: new Date(), metodo: 'manual' };
    await models.Asistencia.create({ ...base, inscripcionId: s.orgA._id, horas: 4, estado: 'validada' });
    await models.Asistencia.create({ ...base, inscripcionId: s.orgB._id, horas: 3, estado: 'abierta' });

    const res = await request(app).get('/api/v1/admin/judiciales/horas').set(bearer(s.admin));
    expect(res.status).toBe(200);
    const j = res.body.data.find((u) => u.id === String(s.judicial.usuario._id));
    expect(j).toMatchObject({ horasAsignadas: 30, horasCumplidas: 4, horasRestantes: 26 });
  });

  test('un coordinador no puede consultar las horas judiciales -> 403', async () => {
    expect((await request(app).get('/api/v1/admin/judiciales/horas').set(bearer(s.coordA))).status).toBe(403);
  });
});

describe('RS9 · auditoría', () => {
  test('el admin ve los eventos, con filtro por resultado', async () => {
    const res = await request(app).get('/api/v1/admin/auditoria?resultado=denegado').set(bearer(s.admin));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((e) => e.resultado === 'denegado')).toBe(true);
    expect(res.body.data.some((e) => e.accion === 'reauth_faltante')).toBe(true);
  });
});
