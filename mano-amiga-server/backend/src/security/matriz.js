/* RS10 · Matriz endpoint × rol.
 
  Es la MISMA tabla de la sección 3.3 del informe de Apps Móviles, pero en código:
   - La lista blanca de endpoints públicos (RS8) se arma a partir de esta matriz (acceso: 'publico').
   - Los tests (tests/matriz.test.js) recorren la matriz y verifican que:
       1) toda ruta registrada en Express figura acá (nadie agrega un endpoint "a escondidas"),
       2) todo endpoint no público responde 401 sin token,
       3) todo rol que NO figura en "roles" recibe 403.
 
  acceso:  'publico' | 'jwt'
  roles:   roles que pasan el control por rol (RS1). [] en los públicos.
  control: control adicional que hace el service (titularidad RS2, organización RS3, ABAC).
  sprint:  en qué sprint se implementó (según el Plan de sprints). Todos están implementados.
 */
const TODOS = ['voluntario', 'coordinador', 'admin'];

const matriz = [
  // --- Autenticación y cuenta ---
  { metodo: 'POST', ruta: '/api/v1/auth/register', acceso: 'publico', roles: [], control: 'Rol siempre voluntario', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/auth/login', acceso: 'publico', roles: [], control: 'Rate limit 5/15 min', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/auth/refresh', acceso: 'publico', roles: [], control: 'Refresh token válido y no reusado', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/auth/logout', acceso: 'jwt', roles: TODOS, control: 'Borra sus sesiones', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/auth/reauth', acceso: 'jwt', roles: ['admin'], control: 'RS9 · rate limit 5/15 min por usuario', sprint: 3 },
  { metodo: 'GET', ruta: '/api/v1/usuarios/me', acceso: 'jwt', roles: TODOS, control: 'id del token', sprint: 1 },
  { metodo: 'PATCH', ruta: '/api/v1/usuarios/me', acceso: 'jwt', roles: TODOS, control: 'id del token · lista blanca de campos', sprint: 3 },
  { metodo: 'PATCH', ruta: '/api/v1/usuarios/me/password', acceso: 'jwt', roles: TODOS, control: 'id del token · cierra las demás sesiones (RS5)', sprint: 3 },
  { metodo: 'GET', ruta: '/api/v1/usuarios/me/accesos', acceso: 'jwt', roles: TODOS, control: 'id del token', sprint: 3 },
  { metodo: 'POST', ruta: '/api/v1/usuarios/me/push-token', acceso: 'jwt', roles: TODOS, control: 'id del token', sprint: 1 },

  // --- Administración (todas además exigen el rol admin a nivel de router) ---
  { metodo: 'GET', ruta: '/api/v1/admin/organizaciones', acceso: 'jwt', roles: ['admin'], control: '', sprint: 3 },
  { metodo: 'POST', ruta: '/api/v1/admin/organizaciones', acceso: 'jwt', roles: ['admin'], control: 'reauth (RS9)', sprint: 3 },
  { metodo: 'DELETE', ruta: '/api/v1/admin/organizaciones/:id', acceso: 'jwt', roles: ['admin'], control: 'reauth (RS9) + RS5', sprint: 3 },
  { metodo: 'GET', ruta: '/api/v1/admin/usuarios', acceso: 'jwt', roles: ['admin'], control: 'Sin teléfono', sprint: 3 },
  { metodo: 'POST', ruta: '/api/v1/admin/coordinadores', acceso: 'jwt', roles: ['admin'], control: 'reauth (RS9)', sprint: 3 },
  { metodo: 'DELETE', ruta: '/api/v1/admin/coordinadores/:id', acceso: 'jwt', roles: ['admin'], control: 'reauth (RS9) + RS5', sprint: 3 },
  { metodo: 'PATCH', ruta: '/api/v1/admin/voluntarios/:id/judicial', acceso: 'jwt', roles: ['admin'], control: 'reauth (RS9)', sprint: 3 },
  { metodo: 'GET', ruta: '/api/v1/admin/judiciales/horas', acceso: 'jwt', roles: ['admin'], control: 'Horas calculadas de asistencias validadas (R10)', sprint: 2 },
  { metodo: 'GET', ruta: '/api/v1/admin/auditoria', acceso: 'jwt', roles: ['admin'], control: 'Solo lectura (RS9)', sprint: 3 },

  // --- Actividades ---
  { metodo: 'GET', ruta: '/api/v1/etiquetas', acceso: 'publico', roles: [], control: '', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/actividades', acceso: 'jwt', roles: TODOS, control: 'ABAC en la consulta', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/actividades/:id', acceso: 'jwt', roles: TODOS, control: 'ABAC (403)', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/actividades', acceso: 'jwt', roles: ['coordinador'], control: 'org del token', sprint: 1 },
  { metodo: 'PATCH', ruta: '/api/v1/actividades/:id', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },
  { metodo: 'DELETE', ruta: '/api/v1/actividades/:id', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },

  // --- Inscripciones ---
  { metodo: 'POST', ruta: '/api/v1/actividades/:id/inscripciones', acceso: 'jwt', roles: ['voluntario'], control: 'ABAC + cupo', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/usuarios/me/inscripciones', acceso: 'jwt', roles: ['voluntario'], control: 'Titular (id del token)', sprint: 1 },
  { metodo: 'DELETE', ruta: '/api/v1/inscripciones/:id', acceso: 'jwt', roles: ['voluntario'], control: 'Titular (RS2)', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/actividades/:id/inscripciones', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },
  { metodo: 'PATCH', ruta: '/api/v1/inscripciones/:id', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/inscripciones/:id/certificado', acceso: 'jwt', roles: ['voluntario', 'coordinador'], control: 'Titular (RS2) o coordinador de la org (RS3)', sprint: 1 },

  // --- Asistencias y horas ---
  { metodo: 'GET', ruta: '/api/v1/actividades/:id/qr', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/actividades/:id/asistencias', acceso: 'jwt', roles: ['voluntario'], control: 'Titular con inscripción aceptada', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/actividades/:id/asistencias', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/inscripciones/:id/asistencia-manual', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },
  { metodo: 'PATCH', ruta: '/api/v1/asistencias/:id/validar', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/usuarios/me/horas', acceso: 'jwt', roles: ['voluntario'], control: 'Solo si esJudicial', sprint: 1 },

  // --- Mapa y comunidad ---
  { metodo: 'GET', ruta: '/api/v1/mapa/puntos', acceso: 'publico', roles: [], control: 'Solo ubicaciones institucionales (RS7) · ABAC si hay sesión', sprint: 3 },
  { metodo: 'GET', ruta: '/api/v1/campanas', acceso: 'publico', roles: [], control: 'Solo datos institucionales', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/campanas', acceso: 'jwt', roles: ['coordinador'], control: 'org del token', sprint: 1 },
  { metodo: 'GET', ruta: '/api/v1/proyectos/:id/publicaciones', acceso: 'publico', roles: [], control: '', sprint: 1 },
  { metodo: 'POST', ruta: '/api/v1/proyectos/:id/publicaciones', acceso: 'jwt', roles: ['coordinador'], control: 'Coordinador de la org (RS3)', sprint: 1 },

  // --- Infraestructura ---
  { metodo: 'GET', ruta: '/api/v1/health', acceso: 'publico', roles: [], control: 'Sin datos', sprint: 1 },
];

// Convierte '/api/v1/actividades/:id' en una expresión regular exacta.
function aRegex(ruta) {
  const patron = ruta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[a-zA-Z]+/g, '[^/]+');
  return new RegExp(`^${patron}/?$`);
}

const publicos = matriz
  .filter((e) => e.acceso === 'publico')
  .map((e) => ({ metodo: e.metodo, regex: aRegex(e.ruta) }));

function esPublico(metodo, path) {
  return publicos.some((p) => p.metodo === metodo && p.regex.test(path));
}

module.exports = { matriz, esPublico, TODOS };
