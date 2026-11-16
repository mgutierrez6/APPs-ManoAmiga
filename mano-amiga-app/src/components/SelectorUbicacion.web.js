import { View } from 'react-native';
import { Campo, TextoSuave } from './ui';
import { espacio } from '../constants/tema';

/** Versión web (sin react-native-maps ni geocoder del celular): dirección + latitud/longitud a mano. */
export default function SelectorUbicacion({ valor, onChange }) {
  return (
    <View>
      <Campo etiqueta="Dirección" value={valor.direccion} onChangeText={(t) => onChange({ direccion: t })} />
      <TextoSuave estilo={{ marginBottom: espacio.s }}>En la web, copiá la latitud y longitud desde Google Maps (mantené apretado el lugar).</TextoSuave>
      <View style={{ flexDirection: 'row', gap: espacio.s }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Latitud" value={valor.lat} onChangeText={(t) => onChange({ lat: t })} placeholder="-34.91" />
        </View>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Longitud" value={valor.lng} onChangeText={(t) => onChange({ lng: t })} placeholder="-56.17" />
        </View>
      </View>
    </View>
  );
}
