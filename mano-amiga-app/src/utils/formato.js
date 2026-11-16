const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
const dos = (n) => String(n).padStart(2, '0');

export function fechaHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  return `${d.getDate()} ${MESES[d.getMonth()].toLowerCase()} · ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function hora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** Para el "calendario" de las tarjetas: { dia: '24', mes: 'SET' } */
export function diaMes(valor) {
  const d = new Date(valor);
  return { dia: String(d.getDate()), mes: MESES[d.getMonth()] };
}

export function rangoFechas(inicio, fin) {
  if (!inicio) return '';
  const a = new Date(inicio);
  const b = new Date(fin);
  const mismoDia = a.toDateString() === b.toDateString();
  return mismoDia ? `${fechaHora(inicio)} a ${hora(fin)}` : `${fechaHora(inicio)} → ${fechaHora(fin)}`;
}

export const estadoTexto = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  abierta: 'Sin validar',
  validada: 'Validada',
  publicada: 'Publicada',
  finalizada: 'Finalizada',
  activa: 'Activa',
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

/** "martes 4 de noviembre" */
export function fechaLarga(valor = new Date()) {
  const d = new Date(valor);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
}

/** "SÁB 14 NOV 2026" (pastilla de fecha de Mi historia). */
export function fechaPastilla(valor) {
  const d = new Date(valor);
  return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
}

/** "hace 2 días", "hace 3 h", "recién". */
export function haceCuanto(valor) {
  const seg = Math.max(0, (Date.now() - new Date(valor).getTime()) / 1000);
  if (seg < 60) return 'recién';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? 'hace 1 día' : `hace ${d} días`;
  const sem = Math.floor(d / 7);
  if (d < 30) return sem === 1 ? 'hace 1 semana' : `hace ${sem} semanas`;
  const meses = Math.floor(d / 30);
  if (d < 365) return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
  const anios = Math.floor(d / 365);
  return anios === 1 ? 'hace 1 año' : `hace ${anios} años`;
}

/** Saludo según la hora del día. */
export function saludo() {
  const h = new Date().getHours();
  if (h < 12) return '¡Buen día';
  if (h < 20) return '¡Buenas tardes';
  return '¡Buenas noches';
}
