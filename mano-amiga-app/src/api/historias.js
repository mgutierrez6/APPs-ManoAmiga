import { api } from './client';

/* "Mi historia" del voluntario: todo es de la propia persona (la API usa el id del token). */
export const misHistorias = () => api.get('/historias').then((r) => r.data);
export const historiasPendientes = () => api.get('/historias/pendientes').then((r) => r.data);
/** datos: { actividadId, relato, fotos: [ids] } */
export const crearHistoria = (datos) => api.post('/historias', datos).then((r) => r.data);
/** datos: { relato?, fotos?: [ids] } (fotos = la lista completa) */
export const editarHistoria = (id, datos) => api.patch(`/historias/${id}`, datos).then((r) => r.data);
