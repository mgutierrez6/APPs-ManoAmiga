import { Modal, Pressable, StyleSheet } from 'react-native';
import ImagenApi from './ImagenApi';

/** Foto en grande (pantalla completa, fondo oscuro). Se cierra tocando en cualquier lado. */
export default function VisorFoto({ ruta, onCerrar }) {
  return (
    <Modal visible={Boolean(ruta)} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar foto" onPress={onCerrar} style={styles.fondo}>
        {ruta ? <ImagenApi ruta={ruta} modo="contain" estilo={styles.foto} /> : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(7,59,76,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  foto: { width: '100%', height: '75%', backgroundColor: 'transparent', borderRadius: 20 },
});
