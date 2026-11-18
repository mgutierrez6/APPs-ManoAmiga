import { api } from './client';

/** Avisos de la campanita: siempre los de la persona con sesión (la API usa el id del token). */
export const misAvisos = () => api.get('/usuarios/me/notificaciones').then((r) => r.data);

export const avisosSinLeer = () => api.get('/usuarios/me/notificaciones/sin-leer').then((r) => r.data.sinLeer);

export const marcarLeido = (id) => api.patch(`/notificaciones/${id}/leida`).then((r) => r.data);

export const leerTodos = () => api.post('/usuarios/me/notificaciones/leer-todas').then((r) => r.data);
