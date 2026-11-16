import { colores } from './tema';

/*
 Tipos de actividad: cada uno tiene SU color y su ícono (los eligió el equipo de diseño).
 El texto sobre estos colores es siempre azul oscuro (tintaFija), en modo claro y en oscuro.
 Las etiquetas que no están acá (Urgente, Apto programa judicial, Contacto con menores) son
 "características": se muestran como cartelito chico, sin color de tipo.
 */
export const TIPOS = {
  Medioambiente: { color: '#B7D665', icono: 'hoja' },
  Donaciones: { color: '#F9C386', icono: 'familia' },
  'Ollas populares': { color: '#F77279', icono: 'olla' },
  'Hogares de niños': { color: '#E763A5', icono: 'casa' },
  'Apoyo escolar': { color: '#FFF184', icono: 'libro' },
  Oratorios: { color: '#407ADD', icono: 'pelota' },
  'Adultos mayores': { color: '#B9D6FC', icono: 'taza' },
  Animales: { color: '#D7F3FF', icono: 'pata' }, // refugios, rescate, adopciones, cuidado de animales
  Otros: { color: '#F3E9DA', icono: 'estrella' }, // beige (como la card de Campañas): lo que no entra en los demás tipos
};

/** Mezcla un color con blanco (para el "cuadradito clarito" del ícono). */
function mezclarConBlanco(hex, cantidad = 0.5) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => Math.round(v + (255 - v) * cantidad);
  const r = canal((n >> 16) & 255);
  const g = canal((n >> 8) & 255);
  const b = canal(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Nombre del tipo de una actividad (la API ya lo manda; si no, la primera etiqueta que sea tipo). */
export function tipoDe(actividad) {
  if (!actividad) return null;
  if (actividad.tipo !== undefined) return actividad.tipo;
  const e = (actividad.etiquetas || []).find((x) => TIPOS[x?.nombre || x]);
  return e ? e.nombre || e : null;
}

/** Estilo de un tipo: color de fondo, versión clarita, ícono y color del texto. Sin tipo -> neutro. */
export function estiloTipo(nombre) {
  const t = TIPOS[nombre];
  if (!t) return estiloTipo('Otros'); // sin tipo = "Otros" (celeste)
  return { color: t.color, clarito: mezclarConBlanco(t.color, 0.5), icono: t.icono, texto: colores.tintaFija, esTipo: true };
}

export const esTipo = (nombre) => Boolean(TIPOS[nombre]);

// Etiquetas que NO son tipos. Ya no se eligen en la app (contacto con menores es una pregunta aparte).
const NO_TIPOS = ['Urgente', 'Apto programa judicial', 'Contacto con menores'];
/** ¿Esta etiqueta es un tipo de actividad? (sirve aunque la base todavía no tenga el campo clase). */
export const etiquetaEsTipo = (e) => e && e.clase !== 'caracteristica' && !NO_TIPOS.includes(e.nombre);
