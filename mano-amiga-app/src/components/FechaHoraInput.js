import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colores, espacio, estilosDinamicos, fuentes } from '../constants/tema';
import { fechaHora } from '../utils/formato';
import Icono from './Icono';

/**
 * Selector de fecha y hora. En Android abre primero la fecha y después la hora (API imperativa);
 * en iOS muestra el selector "datetime" en línea.
 */
export default function FechaHoraInput({ etiqueta, valor, onChange }) {
  const [mostrarIOS, setMostrarIOS] = useState(false);

  const abrir = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: valor,
        mode: 'date',
        onChange: (evento, fecha) => {
          if (evento.type !== 'set' || !fecha) return;
          DateTimePickerAndroid.open({
            value: fecha,
            mode: 'time',
            is24Hour: true,
            onChange: (ev2, conHora) => {
              if (ev2.type === 'set' && conHora) onChange(conHora);
            },
          });
        },
      });
    } else if (Platform.OS === 'ios') {
      setMostrarIOS((v) => !v);
    }
  };

  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Pressable onPress={abrir} style={({ pressed }) => [styles.input, pressed && { borderColor: colores.coral }]}>
        <Icono nombre="actividades" color={colores.tintaSuave} tamano={20} />
        <Text style={styles.valor}>{fechaHora(valor)}</Text>
      </Pressable>
      {Platform.OS === 'ios' && mostrarIOS ? (
        <DateTimePicker value={valor} mode="datetime" display="inline" onChange={(e, fecha) => fecha && onChange(fecha)} accentColor={colores.coral} />
      ) : null}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  campo: { marginBottom: espacio.m },
  etiqueta: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.tintaSuave, marginBottom: 6, marginLeft: 4 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: 16,
    paddingHorizontal: espacio.m,
    paddingVertical: 12,
    backgroundColor: colores.tarjeta,
  },
  icono: { fontSize: 18, marginRight: 8 },
  valor: { fontFamily: fuentes.textoMedio, fontSize: 16, color: colores.tinta },
}));
