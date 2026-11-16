import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import Icono from './Icono';
import { Campo } from './ui';
import { colores, espacio, estilosDinamicos, fuentes } from '../constants/tema';
import { useTema } from '../hooks/useTema';
import { REGION_INICIAL } from '../screens/mapa/comun';

/** Arma una dirección corta ("Rambla Rep. de Chile 4100, Montevideo") a partir de lo que devuelve el geocoder del celular. */
function direccionCorta(r) {
  if (!r) return '';
  const calle = r.street ? `${r.street}${r.streetNumber ? ` ${r.streetNumber}` : ''}` : r.name;
  return [calle, r.city || r.subregion || r.region].filter(Boolean).join(', ');
}

/**
 * Ubicación de una actividad como en las apps de delivery:
 *  - se escribe la dirección y se busca ("Buscar en el mapa"), o
 *  - se toca el mapa / se arrastra el pin, y la dirección se completa sola.
 * Usa el geocoder del sistema (expo-location): no necesita API key extra.
 *
 * valor = { direccion, lat, lng } (lat/lng como string, igual que el formulario). onChange recibe los campos que cambian.
 */
export default function SelectorUbicacion({ valor, onChange }) {
  const { modo } = useTema();
  const mapa = useRef(null);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const lat = parseFloat(valor.lat);
  const lng = parseFloat(valor.lng);
  const hayPin = !Number.isNaN(lat) && !Number.isNaN(lng);

  // Al editar una actividad que ya tiene ubicación, el mapa arranca centrado en ella.
  const regionInicial = useRef(hayPin ? { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 } : REGION_INICIAL).current;

  const centrar = (latitude, longitude) => mapa.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 350);

  /** El coordinador movió el pin: guardamos el punto y completamos la dirección. */
  const ponerPin = async ({ latitude, longitude }) => {
    setAviso(null);
    onChange({ lat: String(latitude.toFixed(6)), lng: String(longitude.toFixed(6)) });
    try {
      const [r] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const dir = direccionCorta(r);
      if (dir) onChange({ direccion: dir });
    } catch {
      // Sin geocoder (o sin conexión): queda el punto y la dirección que haya escrito.
    }
  };

  /** Buscar la dirección escrita y llevar el pin ahí. */
  const buscar = async () => {
    const texto = (valor.direccion || '').trim();
    if (texto.length < 4) return setAviso('Escribí la dirección (calle y número) para buscarla.');
    setBuscando(true);
    setAviso(null);
    try {
      const consulta = /uruguay/i.test(texto) ? texto : `${texto}, Uruguay`;
      const [r] = await Location.geocodeAsync(consulta);
      if (!r) {
        setAviso('No encontramos esa dirección. Probá agregando la ciudad, o tocá el mapa donde es.');
      } else {
        onChange({ lat: String(r.latitude.toFixed(6)), lng: String(r.longitude.toFixed(6)) });
        centrar(r.latitude, r.longitude);
      }
    } catch {
      setAviso('No pudimos buscar la dirección. Tocá el mapa donde es la actividad.');
    } finally {
      setBuscando(false);
    }
  };

  /** Usar la ubicación actual del celular (útil si el coordinador está en el lugar). */
  const aca = async () => {
    setAviso(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return setAviso('Sin permiso de ubicación. Podés buscar la dirección o tocar el mapa.');
    setBuscando(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await ponerPin(pos.coords);
      centrar(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setAviso('No pudimos obtener tu ubicación.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <View>
      <Campo
        etiqueta="Dirección"
        value={valor.direccion}
        onChangeText={(t) => onChange({ direccion: t })}
        placeholder="Ej.: Rambla Rep. de Chile 4100, Montevideo"
        returnKeyType="search"
        onSubmitEditing={buscar}
      />
      <View style={styles.acciones}>
        <Pressable accessibilityRole="button" onPress={buscar} disabled={buscando} style={({ pressed }) => [styles.accion, styles.accionPrincipal, pressed && { opacity: 0.7 }]}>
          {buscando ? <ActivityIndicator size="small" color={colores.tinta} /> : <Icono nombre="buscar" color={colores.tinta} tamano={16} />}
          <Text style={styles.accionTexto}>Buscar en el mapa</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={aca} disabled={buscando} style={({ pressed }) => [styles.accion, pressed && { opacity: 0.7 }]}>
          <Icono nombre="punto" color={colores.tinta} tamano={16} />
          <Text style={styles.accionTexto}>Estoy acá</Text>
        </Pressable>
      </View>

      <View style={styles.mapaCaja}>
        <MapView
          ref={mapa}
          style={StyleSheet.absoluteFill}
          initialRegion={regionInicial}
          toolbarEnabled={false}
          userInterfaceStyle={modo === 'oscuro' ? 'dark' : 'light'}
          onPress={(e) => ponerPin(e.nativeEvent.coordinate)}
        >
          {hayPin ? <Marker coordinate={{ latitude: lat, longitude: lng }} draggable onDragEnd={(e) => ponerPin(e.nativeEvent.coordinate)} pinColor={colores.coral} /> : null}
        </MapView>
        {!hayPin ? (
          <View style={styles.velo} pointerEvents="none">
            <Text style={styles.veloTexto}>Tocá el mapa donde es la actividad</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.ayuda}>{aviso || (hayPin ? 'Si el pin no quedó justo, arrastralo o tocá el lugar exacto.' : 'Buscá la dirección o tocá el mapa.')}</Text>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  acciones: { flexDirection: 'row', gap: espacio.s, marginBottom: espacio.s },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 999, borderWidth: 1.5, borderColor: colores.borde },
  accionPrincipal: { backgroundColor: colores.pista, borderColor: colores.pista },
  accionTexto: { fontFamily: fuentes.semi, fontSize: 13, color: colores.tinta },
  mapaCaja: { height: 210, borderRadius: 18, overflow: 'hidden', backgroundColor: colores.pista },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },
  veloTexto: { fontFamily: fuentes.semi, fontSize: 12.5, color: colores.tintaFija, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  ayuda: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaSuave, marginTop: 6 },
}));
