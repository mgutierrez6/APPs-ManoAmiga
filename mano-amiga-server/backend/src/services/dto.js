/**
 * DTOs de respuesta (5.5): cada respuesta incluye SOLO los campos que quien consulta puede ver.
 * Nunca se devuelve un documento de Mongoose "tal cual".
 */
const id = (v) => (v ? String(v._id || v) : null);

/** URL (relativa a /api/v1) de una foto subida. La app la pide con su token. */
const foto = (archivoId) => (archivoId ? `/archivos/${id(archivoId)}` : null);

/** Tipo de actividad = primera etiqueta de clase "tipo". Define el color y el ícono en la app. */
function tipoDe(etiquetas) {
  const t = (etiquetas || []).find((e) => e && e.nombre && (e.clase || 'tipo') === 'tipo');
  return t ? t.nombre : null;
}

/** cupo null = cupos ilimitados: no hay "lugares libres" que contar. */
const cuposLibres = (a) => (a.cupo == null ? null : Math.max(0, a.cupo - (a.inscriptos || 0)));

const orgResumen = (o) => (o && o.nombre ? { id: id(o), nombre: o.nombre } : { id: id(o) });

function usuarioPropio(u) {
  return {
    id: id(u),
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    telefono: u.telefono || '',
    rol: u.rol,
    organizacionId: id(u.organizacionId),
    esJudicial: Boolean(u.esJudicial),
    horasAsignadas: u.esJudicial ? u.horasAsignadas || 0 : undefined,
    preferencias: u.preferencias || { tema: 'sistema' },
    foto: foto(u.fotoId),
  };
}

// Lo mínimo para la sesión en la app.
function usuarioSesion(u) {
  return { id: id(u), nombre: u.nombre, rol: u.rol, organizacionId: id(u.organizacionId), esJudicial: Boolean(u.esJudicial) };
}

// Voluntario visto por un coordinador DE SU organización (RS6 permite teléfono, apellido y condición judicial).
function voluntarioParaCoordinador(u) {
  if (!u) return null;
  return {
    id: id(u),
    nombre: u.nombre,
    apellido: u.apellido,
    telefono: u.telefono || '',
    esJudicial: Boolean(u.esJudicial),
  };
}

function etiqueta(e) {
  return { id: id(e), nombre: e.nombre, sensible: Boolean(e.sensible), clase: e.clase || 'tipo' };
}

function actividad(a) {
  const org = orgResumen(a.organizacionId);
  return {
    id: id(a),
    titulo: a.titulo,
    descripcion: a.descripcion,
    organizacion: org,
    organizacionId: org.id,
    etiquetas: (a.etiquetas || []).map((e) => (e && e.nombre ? { id: id(e), nombre: e.nombre, clase: e.clase || 'tipo' } : { id: id(e) })),
    tipo: tipoDe(a.etiquetas),
    contactoMenores: (a.etiquetas || []).some((e) => e && e.nombre === 'Contacto con menores'),
    ubicacion: a.ubicacion ? { lat: a.ubicacion.coordinates[1], lng: a.ubicacion.coordinates[0] } : null,
    direccion: a.direccion || '',
    fechaInicio: a.fechaInicio,
    fechaFin: a.fechaFin,
    cupo: a.cupo == null ? null : a.cupo,
    cupoIlimitado: a.cupo == null,
    inscriptos: a.inscriptos,
    cuposLibres: cuposLibres(a),
    estado: a.estado,
  };
}

function actividadResumen(a) {
  if (!a || !a.titulo) return { id: id(a) };
  return {
    id: id(a),
    titulo: a.titulo,
    fechaInicio: a.fechaInicio,
    fechaFin: a.fechaFin,
    direccion: a.direccion || '',
    estado: a.estado,
    tipo: tipoDe(a.etiquetas),
    organizacion: a.organizacionId && a.organizacionId.nombre ? orgResumen(a.organizacionId) : undefined,
  };
}

// Inscripción vista por el propio voluntario.
function inscripcionPropia(i) {
  return {
    id: id(i),
    actividadId: id(i.actividadId),
    actividad: actividadResumen(i.actividadId),
    estado: i.estado,
    fecha: i.fecha,
  };
}

// Inscripción vista por el coordinador de la organización.
function inscripcionParaCoordinador(i) {
  return {
    id: id(i),
    actividadId: id(i.actividadId),
    estado: i.estado,
    fecha: i.fecha,
    voluntario: voluntarioParaCoordinador(i.voluntarioId),
  };
}

function asistencia(a) {
  const v = a.voluntarioId && a.voluntarioId.nombre ? { id: id(a.voluntarioId), nombre: a.voluntarioId.nombre, apellido: a.voluntarioId.apellido } : { id: id(a.voluntarioId) };
  return {
    id: id(a),
    inscripcionId: id(a.inscripcionId),
    actividadId: id(a.actividadId),
    voluntario: v,
    checkIn: a.checkIn,
    checkOut: a.checkOut || null,
    horas: a.horas,
    metodo: a.metodo,
    estado: a.estado,
    validadaEn: a.validadaEn || null,
  };
}

function campana(c) {
  return {
    id: id(c),
    titulo: c.titulo,
    descripcion: c.descripcion,
    objetivo: c.objetivo || '',
    organizacion: orgResumen(c.organizacionId),
    puntos: (c.puntos || []).map((p) => ({
      id: id(p),
      nombre: p.nombre,
      direccion: p.direccion || '',
      ubicacion: { lat: p.ubicacion.coordinates[1], lng: p.ubicacion.coordinates[0] },
    })),
    fechaInicio: c.fechaInicio,
    fechaFin: c.fechaFin,
    estado: c.estado,
  };
}

// Publicación pública: el autor se muestra solo con su nombre (sin apellido ni contacto).
function publicacion(p) {
  return {
    id: id(p),
    proyectoId: id(p.proyectoId),
    proyectoTipo: p.proyectoTipo,
    tipo: p.tipo,
    contenido: p.contenido,
    autor: p.autorId && p.autorId.nombre ? { nombre: p.autorId.nombre } : null,
    fotos: (p.fotos || []).map(foto),
    fecha: p.fecha,
  };
}

/**
 * Perfil público de una organización. De los coordinadores solo se muestra el nombre y la inicial
 * del apellido (minimización de datos): nada de email ni teléfono.
 */
function organizacionPublica(o, extra = {}) {
  return {
    id: id(o),
    nombre: o.nombre,
    descripcion: o.descripcion || '',
    rubro: o.rubro || '',
    zona: o.zona || '',
    logo: foto(o.logoId),
    portada: foto(o.portadaId),
    coordinadores: (extra.coordinadores || []).map((c) => ({ nombre: c.nombre, inicial: (c.apellido || '').charAt(0).toUpperCase() })),
    realizadas: extra.realizadas || 0,
    proximas: extra.proximas || 0,
  };
}

/** Historia de "Mi historia": solo la ve su dueño. */
function historia(h) {
  const a = h.actividadId && h.actividadId.titulo ? h.actividadId : null;
  return {
    id: id(h),
    actividadId: id(h.actividadId),
    actividad: a
      ? { id: id(a), titulo: a.titulo, fechaInicio: a.fechaInicio, fechaFin: a.fechaFin, direccion: a.direccion || '', tipo: tipoDe(a.etiquetas) }
      : null,
    organizacion: orgResumen(h.organizacionId),
    relato: h.relato || '',
    fotos: (h.fotos || []).map(foto),
    fotoIds: (h.fotos || []).map(id),
    creadaEn: h.createdAt,
  };
}

module.exports = {
  foto,
  tipoDe,
  usuarioPropio,
  usuarioSesion,
  voluntarioParaCoordinador,
  etiqueta,
  actividad,
  actividadResumen,
  inscripcionPropia,
  inscripcionParaCoordinador,
  asistencia,
  campana,
  publicacion,
  organizacionPublica,
  historia,
};
