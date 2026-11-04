const { Actividad, Campana } = require('../models');
const permisos = require('./permisos');

/* R5 Puntos del mapa: actividades publicadas y puntos de acopio de campañas activas.
 
 RS7: solo se devuelven ubicaciones INSTITUCIONALES (la de la actividad o el punto de acopio).
 La ubicación de la persona nunca llega al servidor: el "cerca de mí" se calcula con lat/lng
 opcionales que la app manda solo si el usuario los pide, y no se guardan.
 
 ABAC: el endpoint es público. Si quien consulta es un voluntario judicial -o no se sabe quién es
 (anónimo)- se excluyen las actividades con etiquetas sensibles.
 */
const RADIO_TIERRA_KM = 6378.1;
const MAXIMO = 300;

const latLng = (punto) => ({ lat: punto.coordinates[1], lng: punto.coordinates[0] });

function cercania(campo, q) {
  if (q.lat === undefined || q.lng === undefined) return null;
  return { [campo]: { $geoWithin: { $centerSphere: [[q.lng, q.lat], q.radio / RADIO_TIERRA_KM] } } };
}

async function actividades(usuario, q) {
  const condiciones = [{ estado: 'publicada', fechaFin: { $gte: new Date() } }];
  if (q.etiqueta) condiciones.push({ etiquetas: q.etiqueta });
  if (!usuario || usuario.esJudicial) {
    condiciones.push({ etiquetas: { $nin: await permisos.idsEtiquetasSensibles() } });
  }
  const cerca = cercania('ubicacion', q);
  if (cerca) condiciones.push(cerca);

  const lista = await Actividad.find({ $and: condiciones })
    .sort({ fechaInicio: 1 })
    .limit(MAXIMO)
    .populate({ path: 'organizacionId', select: 'nombre' })
    .populate({ path: 'etiquetas', select: 'nombre' })
    .lean();

  return lista.map((a) => ({
    id: String(a._id),
    tipo: 'actividad',
    titulo: a.titulo,
    organizacion: a.organizacionId ? a.organizacionId.nombre : '',
    etiquetas: (a.etiquetas || []).map((e) => e.nombre),
    ubicacion: latLng(a.ubicacion),
    direccion: a.direccion || '',
    fechaInicio: a.fechaInicio,
    fechaFin: a.fechaFin,
    cuposLibres: Math.max(0, a.cupo - a.inscriptos),
  }));
}

async function puntosDeAcopio(q) {
  const filtro = { estado: 'activa', fechaFin: { $gte: new Date() } };
  if (q.campana) filtro._id = q.campana;
  const cerca = cercania('puntos.ubicacion', q);
  if (cerca) Object.assign(filtro, cerca);

  const campanas = await Campana.find(filtro).sort({ fechaFin: 1 }).limit(MAXIMO).populate({ path: 'organizacionId', select: 'nombre' }).lean();
  const puntos = [];
  for (const c of campanas) {
    for (const p of c.puntos || []) {
      puntos.push({
        id: String(p._id),
        tipo: 'acopio',
        titulo: p.nombre,
        campana: c.titulo,
        campanaId: String(c._id),
        organizacion: c.organizacionId ? c.organizacionId.nombre : '',
        ubicacion: latLng(p.ubicacion),
        direccion: p.direccion || '',
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
      });
    }
  }
  return puntos;
}

async function puntos(usuario, q) {
  // Filtrar por etiqueta deja solo actividades; por campaña, solo sus puntos de acopio.
  const verActividades = ['todos', 'actividad'].includes(q.tipo) && !q.campana;
  const verAcopio = ['todos', 'acopio'].includes(q.tipo) && !q.etiqueta;
  const [a, p] = await Promise.all([verActividades ? actividades(usuario, q) : [], verAcopio ? puntosDeAcopio(q) : []]);
  const data = [...a, ...p];
  return { data, total: data.length };
}

module.exports = { puntos };
