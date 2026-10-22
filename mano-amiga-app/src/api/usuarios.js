import { api } from './client';

export const obtenerPerfil = () => api.get('/usuarios/me').then((r) => r.data);

export const misHoras = () => api.get('/usuarios/me/horas').then((r) => r.data);

export const registrarPushToken = (token) => api.post('/usuarios/me/push-token', { token });

// ----- Sprint 2 (R8 · perfil) -----

/** Solo nombre, apellido, telefono y preferencias.tema (el resto la API lo descarta). */
export const actualizarPerfil = (datos) => api.patch('/usuarios/me', datos).then((r) => r.data);

/** Devuelve una sesión nueva { accessToken, refreshToken, usuario }: las demás quedan cerradas (RS5). */
export const cambiarPassword = (actual, nueva) => api.patch('/usuarios/me/password', { actual, nueva }).then((r) => r.data);

export const misAccesos = (params = {}) => api.get('/usuarios/me/accesos', { params }).then((r) => r.data);
