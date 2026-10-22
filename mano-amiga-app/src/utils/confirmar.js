import { Alert, Platform } from 'react-native';

/** Pregunta "¿Seguro?" y devuelve true/false. En web Alert no muestra botones, así que usa window.confirm. */
export function confirmar(titulo, mensaje, textoOk = 'Confirmar') {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((resolve) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoOk, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
