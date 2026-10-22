import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, estilosDinamicos, fuentes } from '../constants/tema';

// Texto legible sobre cada color de marca (igual que en los botones).
const SOBRE = { coral: 'blanco', oceano: 'blanco', lila: 'blanco', sol: 'tintaFija', menta: 'tintaFija' };

/**
 * Encabezado de las pantallas principales (las pestañas): el color de la sección, plano,
 * con el texto en blanco o tinta según contraste. Sin degradés, figuras ni emojis.
 * "tema" es una familia de color: coral, oceano, lila, sol o menta.
 * Las props "emoji" y "figuras" se aceptan por compatibilidad pero ya no se dibujan.
 */
export default function Hero({ titulo, subtitulo, tema = 'coral', conSafeArea = true, children, compacto = false }) {
  const insets = useSafeAreaInsets();
  const clave = SOBRE[tema] ? tema : 'coral';
  const fondo = colores[clave];
  const texto = colores[SOBRE[clave]];
  return (
    <View style={[styles.hero, { backgroundColor: fondo, paddingTop: (conSafeArea ? insets.top : 0) + (compacto ? espacio.m : espacio.xl) }]}>
      <Text style={[styles.titulo, { color: texto }, compacto && { fontSize: 24, lineHeight: 30 }]}>{titulo}</Text>
      {subtitulo ? <Text style={[styles.subtitulo, { color: texto }]}>{subtitulo}</Text> : null}
      {children ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  hero: {
    paddingHorizontal: espacio.l,
    paddingBottom: espacio.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  titulo: { fontFamily: fuentes.titulo, fontSize: 30, lineHeight: 36 },
  subtitulo: { fontFamily: fuentes.textoMedio, fontSize: 15, marginTop: 4, opacity: 0.92 },
  extra: { marginTop: espacio.l },
}));
