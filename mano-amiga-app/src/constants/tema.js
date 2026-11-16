/*
 Tema de Mano Amiga (rediseño "Paleta 2": Pink Bubblegum, Sunshine y Lime Ripple).
 - Fondo crema y texto azul oscuro en modo claro; fondo azul muy oscuro y texto crema en modo oscuro.
 - Los nombres de las "familias" (coral, sol, menta, oceano, lila) se mantienen para no romper las
   pantallas: lo que cambió es el color que tiene cada una.
 - Los colores de cada TIPO de actividad están en constants/tipos.js.
 */
const marca = {
  coral: '#E763A5', // Pink Bubblegum: color principal (botones, destacados)
  coralOscuro: '#C94489',
  sol: '#F9C386', // Sunshine
  solOscuro: '#E3A45C',
  menta: '#B7D665', // Lime Ripple
  mentaOscuro: '#98B847',
  oceano: '#407ADD', // Sky
  oceanoOscuro: '#2F5FB5',
  lila: '#B9D6FC', // Powder blue
  lilaOscuro: '#8DB4E8',
  durazno: '#F77279', // Coral red
  limon: '#FFF184', // Lemon sorbet
  blanco: '#FFFFFF',
  tintaFija: '#073B4C', // texto sobre cualquier color de la paleta (siempre azul oscuro)
  peligro: '#D62246',
  primario: '#E763A5',
  secundario: '#407ADD',
  advertencia: '#E3A45C',
};

export const paletas = {
  claro: {
    ...marca,
    coralSuave: '#FBE0EE',
    solSuave: '#FDEBD3',
    mentaSuave: '#EAF3D2',
    oceanoSuave: '#DCE7FA',
    lilaSuave: '#E6F0FE',
    neutroSuave: '#F1EADF',
    beige: '#F3E9DA', // card de Campañas de donación
    coralTexto: '#A8326F',
    solTexto: marca.tintaFija,
    mentaTexto: marca.tintaFija,
    oceanoTexto: '#2F5FB5',
    lilaTexto: marca.tintaFija,
    tinta: '#073B4C', // texto principal
    tintaSuave: '#4A6572', // texto secundario
    crema: '#FBF7F0', // fondo general
    tarjeta: '#FFFFFF', // superficies (tarjetas, inputs, barra de pestañas)
    campoFoco: '#FFFFFF',
    pista: '#F1EADF', // fondo de barras de progreso y segmentos
    borde: '#ECE3D6',
    linea: '#F1EADF', // separadores finos entre filas
    gris: '#8A9BA3',
    sombra: '#073B4C',
  },
  oscuro: {
    ...marca,
    coralSuave: '#4A2238',
    solSuave: '#4A3A22',
    mentaSuave: '#33421F',
    oceanoSuave: '#1C3157',
    lilaSuave: '#2A3D57',
    neutroSuave: '#24414C',
    beige: '#22383F',
    coralTexto: '#F59AC6',
    solTexto: '#F9C386',
    mentaTexto: '#C9E38A',
    oceanoTexto: '#9DBCF2',
    lilaTexto: '#C8DEFB',
    tinta: '#FBF7F0',
    tintaSuave: '#A9BCC4',
    crema: '#0E1E24',
    tarjeta: '#17303A',
    campoFoco: '#1F3A45',
    pista: '#1F3A45',
    borde: '#2C4A56',
    linea: '#1F3A45',
    gris: '#7E949D',
    sombra: '#000000',
  },
};

// Alias que usan las pantallas existentes.
function conAlias(p) {
  return { ...p, primarioClaro: p.coralSuave, texto: p.tinta, textoSuave: p.tintaSuave, fondo: p.crema };
}

export const colores = conAlias(paletas.claro);

let versionTema = 0;
export let modoActual = 'claro';

/** Copia la paleta pedida en "colores". La llama TemaContext antes de redibujar. */
export function aplicarPaleta(modo) {
  const m = modo === 'oscuro' ? 'oscuro' : 'claro';
  if (m === modoActual) return;
  Object.assign(colores, conAlias(paletas[m]));
  modoActual = m;
  versionTema += 1;
}

/**
 * Reemplazo de StyleSheet.create para estilos que dependen de los colores.
 * Uso: const styles = estilosDinamicos(() => ({ caja: { backgroundColor: colores.tarjeta } }));
 * Devuelve un objeto que se recalcula (una sola vez) cada vez que cambia el tema.
 */
export function estilosDinamicos(fabrica) {
  let cache = null;
  let version = -1;
  const actual = () => {
    if (version !== versionTema) {
      cache = fabrica();
      version = versionTema;
    }
    return cache;
  };
  return new Proxy(
    {},
    {
      get: (_, k) => actual()[k],
      has: (_, k) => k in actual(),
      ownKeys: () => Reflect.ownKeys(actual()),
      getOwnPropertyDescriptor: (_, k) => ({ value: actual()[k], enumerable: true, configurable: true, writable: false }),
    }
  );
}

/*
 Fuentes (se cargan en App.js):
  - Títulos grandes: Pearl Jean (assets/fonts/PearlJean.ttf).
  - Números y subtítulos: Bricolage Grotesque.
  - Texto: Inter (la más parecida a la letra del sistema de Apple, y se ve igual en Android).
 */
export const fuentes = {
  titulo: 'PearlJean',
  tituloMedio: 'BricolageGrotesque_700Bold',
  numero: 'BricolageGrotesque_800ExtraBold',
  texto: 'Inter_400Regular',
  textoMedio: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  negrita: 'Inter_700Bold',
};

/** Estilo de los títulos grandes con Pearl Jean (la letra es alta: se le ajusta el interlineado). */
export const tituloGrande = (tamano = 40) => ({ fontFamily: fuentes.titulo, fontSize: tamano, lineHeight: Math.round(tamano * 1.02), letterSpacing: 0.3 });

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

// Esquinas bien redondeadas (tarjetas tipo "pastilla").
export const radio = 20;

// Cada "familia" de color: fondo sólido, versión oscura, tinte suave y texto.
const NOMBRES_FAMILIA = ['coral', 'sol', 'menta', 'oceano', 'lila'];
const TEXTO_FAMILIA = { coral: 'blanco', sol: 'tintaFija', menta: 'tintaFija', oceano: 'blanco', lila: 'tintaFija' };
export const familias = estilosDinamicos(() =>
  NOMBRES_FAMILIA.map((n) => ({ base: colores[n], oscuro: colores[`${n}Oscuro`], suave: colores[`${n}Suave`], texto: colores[TEXTO_FAMILIA[n]], textoSuave: colores[`${n}Texto`] }))
);

/** Devuelve una familia de color estable a partir de un texto o número (misma clave = mismo color). */
export function familiaPara(clave) {
  const s = String(clave ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return familias[h % familias.length];
}

// Estados: tinte de color + texto (el texto siempre dice el estado, no depende solo del color).
export const estilosEstado = estilosDinamicos(() => ({
  pendiente: { fondo: colores.solSuave, texto: colores.solTexto },
  aceptada: { fondo: colores.mentaSuave, texto: colores.mentaTexto },
  rechazada: { fondo: colores.coralSuave, texto: colores.coralTexto },
  cancelada: { fondo: colores.neutroSuave, texto: colores.tintaSuave },
  abierta: { fondo: colores.oceanoSuave, texto: colores.oceanoTexto },
  validada: { fondo: colores.mentaSuave, texto: colores.mentaTexto },
  publicada: { fondo: colores.mentaSuave, texto: colores.mentaTexto },
  finalizada: { fondo: colores.neutroSuave, texto: colores.tintaSuave },
  activa: { fondo: colores.mentaSuave, texto: colores.mentaTexto },
  admin: { fondo: colores.lilaSuave, texto: colores.lilaTexto },
  inactiva: { fondo: colores.neutroSuave, texto: colores.tintaSuave },
}));

// Compatibilidad con código anterior
export const coloresEstado = estilosDinamicos(() => Object.fromEntries(Object.entries(estilosEstado).map(([k, v]) => [k, v.texto])));

// Antes cada etiqueta tenía un emoji; el diseño ya no usa emojis. Se mantiene la función para no romper llamadas.
export function emojiEtiqueta() {
  return '';
}

// Diseño plano: las superficies se separan por color, no con sombras.
export const sombra = {};
