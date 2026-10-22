import axios from 'axios';
import Constants from 'expo-constants';
import { guardarRefreshToken, leerRefreshToken, borrarRefreshToken } from '../services/secureStorage';

/**
 * URL de la API:
 *  - Si EXPO_PUBLIC_API_URL está definida, se usa esa (producción, o si querés forzar una).
 *  - Si no, en desarrollo se arma sola con la IP de la compu que corre "npx expo start"
 *    (la misma que aparece debajo del QR: exp://ESTA_IP:8081) + el puerto del front-service.
 *    Así no hay que tocar el .env cada vez que cambiás de red.
 */
function resolverApiUrl() {
  const fija = process.env.EXPO_PUBLIC_API_URL;
  if (fija) return fija;
  const puerto = process.env.EXPO_PUBLIC_API_PORT || '8090';
  const hostUri = Constants.expoConfig?.hostUri; // ej: "172.20.10.3:8081"
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:${puerto}/api/v1`;
}

/**
 * Cliente HTTP único de la app (6.3: las pantallas nunca hacen pedidos directamente).
 * - Agrega "Authorization: Bearer <token>" en cada pedido.
 * - Si la API responde 401, intenta renovar la sesión UNA vez con /auth/refresh y repite el pedido.
 * - Si no puede renovar, avisa al AuthContext para cerrar la sesión.
 *
 * No hay secretos en la app.
 */
export const API_URL = resolverApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// El access token vive solo en memoria (dura 15 min). El refresh token, cifrado en SecureStore.
let accessToken = null;
let alExpirarSesion = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function onSesionExpirada(callback) {
  alExpirarSesion = callback;
}

export async function guardarSesion({ accessToken: at, refreshToken }) {
  accessToken = at;
  if (refreshToken) await guardarRefreshToken(refreshToken);
}

export async function limpiarSesion() {
  accessToken = null;
  reauth = { token: null, expira: 0 };
  await borrarRefreshToken();
}

// Renovación "de a una": si varios pedidos reciben 401 a la vez, se hace un solo refresh.
let renovacionEnCurso = null;

export async function renovarSesion() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = (async () => {
      const refreshToken = await leerRefreshToken();
      if (!refreshToken) throw new Error('SIN_SESION');
      // Se usa axios "pelado" para que este pedido no pase por los interceptores.
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { timeout: 15000 });
      await guardarSesion(data);
      return data;
    })().finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const RUTAS_SIN_REINTENTO = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/reauth'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const esRutaAuth = RUTAS_SIN_REINTENTO.some((r) => original?.url?.includes(r));

    if (status === 401 && original && !original._reintento && !esRutaAuth) {
      original._reintento = true;
      try {
        await renovarSesion();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        await limpiarSesion();
        alExpirarSesion();
      }
    }
    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------------------------------ */
/* RS9 · Reautenticación para las acciones del administrador                                   */
/* ------------------------------------------------------------------------------------------ */

// El token de reauth (5 min) vive SOLO en memoria, igual que el access token.
let reauth = { token: null, expira: 0 };
let solicitarReauth = null; // lo registra ReauthProvider: muestra el modal y devuelve { reauthToken, expiraEn }

export function onSolicitarReauth(fn) {
  solicitarReauth = fn;
}

export function olvidarReauth() {
  reauth = { token: null, expira: 0 };
}

const headersReauth = () => (reauth.token && Date.now() < reauth.expira ? { 'X-Reauth-Token': reauth.token } : {});

/**
 * Ejecuta una acción sensible del admin. Si no hay token de reauth vigente pide la contraseña (modal)
 * y lo obtiene; si igual la API responde 403 REAUTH_REQUERIDA, lo pide de nuevo y repite UNA vez.
 *   await conReauth((headers) => api.post('/admin/organizaciones', datos, { headers }))
 */
async function pedirReauth() {
  const r = await solicitarReauth(); // si la persona cancela, lanza un error con cancelado = true
  reauth = { token: r.reauthToken, expira: new Date(r.expiraEn).getTime() - 10000 };
}

export async function conReauth(pedido) {
  // Si no hay un token vigente, pedimos la contraseña ANTES (así no queda un "denegado" en la auditoría).
  if (!headersReauth()['X-Reauth-Token'] && solicitarReauth) await pedirReauth();
  try {
    return await pedido(headersReauth());
  } catch (e) {
    // El token pudo vencer o ser revocado en el medio: se pide una vez más.
    if (codigoDeError(e) !== 'REAUTH_REQUERIDA' || !solicitarReauth) throw e;
  }
  await pedirReauth();
  return pedido(headersReauth());
}

/** Convierte cualquier error en un mensaje para mostrar a la persona (3.6). */
export function mensajeDeError(error) {
  if (error?.cancelado) return 'Acción cancelada.';
  if (!error?.response) {
    return 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.';
  }
  const e = error.response.data?.error;
  if (e?.details?.length) return `${e.message}: ${e.details.map((d) => `${d.campo} (${d.motivo})`).join(', ')}`;
  if (e?.message) return e.message;
  return 'Ocurrió un error inesperado.';
}

export function codigoDeError(error) {
  return error?.response?.data?.error?.code || null;
}
