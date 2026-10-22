import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { colores, espacio, estilosDinamicos } from '../constants/tema';

/**
 * Contenedor estándar de pantallas con formulario o contenido que scrollea.
 * "decorada" se acepta por compatibilidad: el fondo ya no lleva figuras.
 */
export default function Pantalla({ children, scroll = true, estilo, cabecera }) {
  const contenido = scroll ? (
    <ScrollView contentContainerStyle={[styles.contenido, estilo]} keyboardShouldPersistTaps="handled">
      {cabecera}
      <View style={styles.cuerpo}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, estilo]}>
      {cabecera}
      <View style={[styles.cuerpo, styles.flex]}>{children}</View>
    </View>
  );
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex, { backgroundColor: colores.crema }]}>
        {contenido}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = estilosDinamicos(() => ({
  flex: { flex: 1 },
  contenido: { flexGrow: 1, paddingBottom: espacio.xxl },
  cuerpo: { padding: espacio.l },
}));
