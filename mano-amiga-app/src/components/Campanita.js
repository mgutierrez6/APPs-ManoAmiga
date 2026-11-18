import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icono from './Icono';
import { avisosSinLeer } from '../api/avisos';
import { colores, estilosDinamicos, fuentes } from '../constants/tema';

const CADA_MS = 30000; // mientras la pantalla está abierta, vuelve a mirar cada 30 s

/**
 * Campanita de avisos con el número de no leídos. Al tocarla abre la lista de avisos.
 * Se actualiza al volver a la pantalla y cada 30 s mientras está visible.
 */
export default function Campanita() {
  const navigation = useNavigation();
  const [sinLeer, setSinLeer] = useState(0);
  const [visible, setVisible] = useState(false);

  const actualizar = useCallback(() => {
    avisosSinLeer()
      .then(setSinLeer)
      .catch(() => {}); // si falla, se queda con el número anterior
  }, []);

  useFocusEffect(
    useCallback(() => {
      setVisible(true);
      actualizar();
      return () => setVisible(false);
    }, [actualizar])
  );

  useEffect(() => {
    if (!visible) return undefined;
    const t = setInterval(actualizar, CADA_MS);
    return () => clearInterval(t);
  }, [visible, actualizar]);

  const etiqueta = sinLeer ? `Avisos: ${sinLeer} sin leer` : 'Avisos';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} hitSlop={8} onPress={() => navigation.navigate('Avisos')} style={styles.boton}>
      <Icono nombre="campana" color={colores.tinta} tamano={22} />
      {sinLeer ? (
        <View style={styles.numero}>
          <Text style={styles.numeroTexto}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = estilosDinamicos(() => ({
  boton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colores.tarjeta, alignItems: 'center', justifyContent: 'center' },
  numero: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colores.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colores.crema },
  numeroTexto: { fontFamily: fuentes.negrita, fontSize: 10, color: colores.tintaFija },
}));
