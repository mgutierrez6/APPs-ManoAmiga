import { api } from './client';

/**
 * Puntos del mapa (R5). La app NO manda la ubicación de la persona: pide los puntos y los muestra
 * alrededor de donde esté, todo dentro del celular (RS7, minimización de datos).
 * params: { tipo: 'todos' | 'actividad' | 'acopio', etiqueta }
 */
export const puntosDelMapa = (params = {}) => api.get('/mapa/puntos', { params }).then((r) => r.data);
