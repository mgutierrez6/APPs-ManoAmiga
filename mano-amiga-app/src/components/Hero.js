import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, estilosDinamicos, fuentes, tituloGrande } from '../constants/tema';

/**
 * Encabezado de las pantallas principales (las pestañas): un texto chico arriba y el título grande
 * con la letra de la marca, sobre el fondo crema. "derecha" es un elemento opcional al costado.
 * Las props "tema", "emoji" y "figuras" se aceptan por compatibilidad pero ya no se usan.
 */
export default function Hero({ titulo, subtitulo, antetitulo, conSafeArea = true, children, compacto = false, derecha }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: (conSafeArea ? insets.top : 0) + (compacto ? espacio.m : espacio.xl) }]}>
      {antetitulo || derecha ? (
        <View style={styles.fila}>
          <Text style={styles.antetitulo}>{antetitulo || ''}</Text>
          {derecha}
        </View>
      ) : null}
      <Text style={[styles.titulo, compacto && tituloGrande(32)]}>{titulo}</Text>
      {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      {children ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  hero: { paddingHorizontal: espacio.xl, paddingBottom: espacio.l },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  antetitulo: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave },
  titulo: { ...tituloGrande(42), color: colores.tinta },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 14, marginTop: 8, color: colores.tintaSuave, lineHeight: 20 },
  extra: { marginTop: espacio.l },
}));
