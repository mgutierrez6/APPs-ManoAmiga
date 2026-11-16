import { api } from './client';

/* Perfil público de una organización (lo ven todos con sesión) y lo que hace su coordinador. */
export const perfilOrganizacion = (id) => api.get(`/organizaciones/${id}`).then((r) => r.data);
export const publicacionesOrganizacion = (id, params = {}) => api.get(`/organizaciones/${id}/publicaciones`, { params }).then((r) => r.data);
export const proximasOrganizacion = (id) => api.get(`/organizaciones/${id}/proximas`).then((r) => r.data);

// Coordinador: la organización sale del token ("mia"), nunca se manda el id.
/** datos: { descripcion, rubro, zona, logoId, portadaId } */
export const editarMiOrganizacion = (datos) => api.patch('/organizaciones/mia', datos).then((r) => r.data);
export const realizadasDeMiOrganizacion = () => api.get('/organizaciones/mia/realizadas').then((r) => r.data);
/** datos: { actividadId, contenido, fotos: [ids] } */
export const publicarEnMiOrganizacion = (datos) => api.post('/organizaciones/mia/publicaciones', datos).then((r) => r.data);
