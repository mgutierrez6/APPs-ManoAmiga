import { api, conReauth } from './client';

/**
 * Panel de administración (R7). Las lecturas van directo; las escrituras pasan por conReauth (RS9):
 * si hace falta, se le pide la contraseña al admin y se repite el pedido.
 */

export const listarOrganizaciones = (params = {}) => api.get('/admin/organizaciones', { params }).then((r) => r.data);

export const crearOrganizacion = (datos) => conReauth((headers) => api.post('/admin/organizaciones', datos, { headers })).then((r) => r.data);

export const bajaOrganizacion = (id) => conReauth((headers) => api.delete(`/admin/organizaciones/${id}`, { headers }));

/** params: { buscar, rol, page, limit } */
export const listarUsuarios = (params = {}) => api.get('/admin/usuarios', { params }).then((r) => r.data);

export const asignarCoordinador = (usuarioId, organizacionId) =>
  conReauth((headers) => api.post('/admin/coordinadores', { usuarioId, organizacionId }, { headers })).then((r) => r.data);

export const quitarCoordinador = (usuarioId) => conReauth((headers) => api.delete(`/admin/coordinadores/${usuarioId}`, { headers }));

/** esJudicial=true exige horasAsignadas; false las borra. */
export const actualizarJudicial = (usuarioId, esJudicial, horasAsignadas) =>
  conReauth((headers) =>
    api.patch(`/admin/voluntarios/${usuarioId}/judicial`, esJudicial ? { esJudicial, horasAsignadas } : { esJudicial }, { headers })
  ).then((r) => r.data);

export const horasJudiciales = (params = {}) => api.get('/admin/judiciales/horas', { params }).then((r) => r.data);

/** params: { accion, resultado, page, limit } */
export const auditoria = (params = {}) => api.get('/admin/auditoria', { params }).then((r) => r.data);
