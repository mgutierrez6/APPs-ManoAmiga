/* RS1, RS4, RS8, RS10 · La matriz endpoint × rol se verifica automáticamente.
 */
const { listarRutas } = require('../src/routes');
const { app, request, conectar, desconectar, crearUsuario, crearOrganizacion } = require('./helpers');
const { matriz, TODOS } = require('../src/security/matriz');

const ID_FALSO = '64b7f0c2a1b2c3d4e5f60718';
const aUrl = (ruta) => ruta.replace(/:[a-zA-Z]+/g, ID_FALSO);

let tokens = {};

beforeAll(async () => {
  await conectar();
  const org = await crearOrganizacion();
  tokens = {
    voluntario: (await crearUsuario()).token,
    coordinador: (await crearUsuario({ rol: 'coordinador', organizacionId: org._id })).token,
    admin: (await crearUsuario({ rol: 'admin' })).token,
  };
});
afterAll(desconectar);

describe('RS10 · la matriz documenta todas las rutas', () => {
  const registradas = listarRutas();
  const documentadas = matriz.map((e) => `${e.metodo} ${e.ruta}`);

  test('toda ruta registrada en Express figura en la matriz', () => {
    const sinDocumentar = registradas.filter((r) => !documentadas.includes(r));
    expect(sinDocumentar).toEqual([]);
  });

  test('todo endpoint de la matriz está implementado', () => {
    const faltan = documentadas.filter((d) => !registradas.includes(d));
    expect(faltan).toEqual([]);
  });
});

describe('RS8 · denegar por defecto: sin token -> 401 salvo la lista blanca', () => {
  for (const e of matriz.filter((x) => x.acceso === 'jwt')) {
    test(`${e.metodo} ${e.ruta} sin token responde 401`, async () => {
      const res = await request(app)[e.metodo.toLowerCase()](aUrl(e.ruta)).send({});
      expect(res.status).toBe(401);
    });
  }

  test('los endpoints de la lista blanca responden sin token', async () => {
    for (const ruta of ['/api/v1/health', '/api/v1/etiquetas', '/api/v1/campanas', '/api/v1/mapa/puntos']) {
      expect((await request(app).get(ruta)).status).toBe(200);
    }
    // login sin datos: 400 (validación), no 401 -> llegó al endpoint sin pedir token
    expect((await request(app).post('/api/v1/auth/login').send({})).status).toBe(400);
  });

  test('token con firma inválida -> 401', async () => {
    const res = await request(app).get('/api/v1/usuarios/me').set('Authorization', `Bearer ${tokens.voluntario}x`);
    expect(res.status).toBe(401);
  });

  test('token con "alg: none" -> 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: ID_FALSO, typ: 'access' })).toString('base64url');
    const res = await request(app).get('/api/v1/usuarios/me').set('Authorization', `Bearer ${header}.${payload}.`);
    expect(res.status).toBe(401);
  });

  test('una ruta inexistente también exige token (no revela qué existe)', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(401);
  });
});

describe('RS1 / RS4 · cada rol que no figura en la matriz recibe 403 (control en el servidor)', () => {
  for (const e of matriz.filter((x) => x.acceso === 'jwt')) {
    for (const rol of TODOS.filter((r) => !e.roles.includes(r))) {
      test(`${rol} -> ${e.metodo} ${e.ruta} = 403`, async () => {
        const res = await request(app)[e.metodo.toLowerCase()](aUrl(e.ruta)).set('Authorization', `Bearer ${tokens[rol]}`).send({});
        expect(res.status).toBe(403);
      });
    }
  }
});
