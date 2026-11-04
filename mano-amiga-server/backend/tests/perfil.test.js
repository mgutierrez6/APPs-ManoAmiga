/* R8:  Perfil y configuración: datos de contacto, modo oscuro, cambio de contraseña e historial de accesos.
 */
const { app, request, conectar, desconectar, crearUsuario, bearer, models } = require('./helpers');

beforeAll(conectar);
afterAll(desconectar);

const login = async (u, password = u.password) => request(app).post('/api/v1/auth/login').send({ email: u.usuario.email, password });

describe('PATCH /usuarios/me', () => {
  test('actualiza nombre, teléfono y el tema (modo oscuro)', async () => {
    const u = await crearUsuario();
    const res = await request(app).patch('/api/v1/usuarios/me').set(bearer(u)).send({ nombre: 'Ana', telefono: '099 111 222', preferencias: { tema: 'oscuro' } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: 'Ana', telefono: '099 111 222', preferencias: { tema: 'oscuro' } });
    expect((await request(app).get('/api/v1/usuarios/me').set(bearer(u))).body.preferencias.tema).toBe('oscuro');
  });

  test('mass assignment: rol, esJudicial, horas y email se ignoran', async () => {
    const u = await crearUsuario();
    await request(app).patch('/api/v1/usuarios/me').set(bearer(u)).send({ nombre: 'Beto', rol: 'admin', esJudicial: true, horasAsignadas: 0, email: 'otro@x.com' });
    const db = await models.Usuario.findById(u.usuario._id).lean();
    expect(db).toMatchObject({ nombre: 'Beto', rol: 'voluntario', esJudicial: false, email: u.usuario.email });
  });

  test('tema inválido -> 400', async () => {
    const u = await crearUsuario();
    expect((await request(app).patch('/api/v1/usuarios/me').set(bearer(u)).send({ preferencias: { tema: 'rosa' } })).status).toBe(400);
  });
});

describe('PATCH /usuarios/me/password', () => {
  test('con la actual incorrecta -> 400 PASSWORD_ACTUAL_INCORRECTA (no 401)', async () => {
    const u = await crearUsuario();
    const res = await request(app).patch('/api/v1/usuarios/me/password').set(bearer(u)).send({ actual: 'NoEsEsta1', nueva: 'NuevaClave123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PASSWORD_ACTUAL_INCORRECTA');
  });

  test('cambia la contraseña, cierra las OTRAS sesiones y devuelve una nueva', async () => {
    const u = await crearUsuario();
    const otroCelular = (await login(u)).body;

    const res = await request(app).patch('/api/v1/usuarios/me/password').set(bearer(u)).send({ actual: u.password, nueva: 'NuevaClave123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();

    // La sesión del otro celular ya no se puede renovar (RS5)
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: otroCelular.refreshToken })).status).toBe(401);
    // La nueva sí
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: res.body.refreshToken })).status).toBe(200);

    expect((await login(u)).status).toBe(401);
    expect((await login(u, 'NuevaClave123')).status).toBe(200);
  });

  test('nueva contraseña corta -> 400', async () => {
    const u = await crearUsuario();
    expect((await request(app).patch('/api/v1/usuarios/me/password').set(bearer(u)).send({ actual: u.password, nueva: 'corta' })).status).toBe(400);
  });
});

describe('GET /usuarios/me/accesos', () => {
  test('muestra solo los eventos de la propia cuenta, del más nuevo al más viejo', async () => {
    const u = await crearUsuario();
    const otro = await crearUsuario();
    await login(u, 'mal-password');
    await login(u);
    await login(otro);

    const res = await request(app).get('/api/v1/usuarios/me/accesos').set(bearer(u));
    expect(res.status).toBe(200);
    expect(res.body.data.map((a) => `${a.accion}:${a.resultado}`)).toEqual(['login:ok', 'login:fallo']);
    expect(res.body.total).toBe(2);
  });
});
