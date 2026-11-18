import { api } from './client';

/** Chat de una actividad. Solo inscriptos aceptados y coordinadores de la org (lo controla la API). */
export const leerMensajes = (actividadId, despues) => api.get(`/actividades/${actividadId}/mensajes`, { params: despues ? { despues } : {} }).then((r) => r.data);

export const enviarMensaje = (actividadId, texto) => api.post(`/actividades/${actividadId}/mensajes`, { texto }).then((r) => r.data);

export const borrarMensaje = (id) => api.delete(`/mensajes/${id}`);
