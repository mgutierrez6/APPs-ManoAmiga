import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MensajeError } from '../../components/ui';
import { useTema } from '../../hooks/useTema';
import { colores, espacio, estilosDinamicos, fuentes, sombra } from '../../constants/tema';
import { FichaPunto, FiltrosMapa, REGION_INICIAL, colorPunto, usePuntos } from './comun';
import Icono from '../../components/Icono';

/**
 * Mapa de actividades y puntos de acopio (R5).
 *
 * Privacidad (RS7): la ubicación de la persona se usa SOLO dentro del celular para centrar el mapa.
 * Nunca se manda al servidor; la app pide los puntos institucionales y el mapa los dibuja.
 */
export default function MapaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { modo } = useTema();
  const mapa = useRef(null);
  const { puntos, tipo, setTipo, error, recargar } = usePuntos();
  const [seleccionado, setSeleccionado] = useState(null);
  const [miUbicacion, setMiUbicacion] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState(null);

  // Si el filtro cambia y el punto elegido ya no está, se cierra la ficha.
  useEffect(() => {
    if (seleccionado && !puntos.some((p) => p.id === seleccionado.id)) setSeleccionado(null);
  }, [puntos, seleccionado]);

  const centrarEnMi = async () => {
    setAvisoUbicacion(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setAvisoUbicacion('Sin permiso de ubicación: podés mover el mapa a mano.');
      return;
    }
    setMiUbicacion(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapa.current?.animateToRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600);
    } catch {
      setAvisoUbicacion('No pudimos obtener tu ubicación.');
    }
  };

  const elegir = (p) => {
    setSeleccionado(p);
    mapa.current?.animateToRegion({ latitude: p.ubicacion.lat - 0.008, longitude: p.ubicacion.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 400);
  };

  return (
    <View style={styles.contenedor}>
      <MapView
        ref={mapa}
        style={styles.mapa}
        initialRegion={REGION_INICIAL}
        showsUserLocation={miUbicacion}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        userInterfaceStyle={modo === 'oscuro' ? 'dark' : 'light'}
        customMapStyle={modo === 'oscuro' ? ESTILO_OSCURO : []}
        onPress={() => setSeleccionado(null)}
      >
        {puntos.map((p) => (
          <Marcador key={`${p.tipo}-${p.id}`} punto={p} activo={seleccionado?.id === p.id} onPress={() => elegir(p)} />
        ))}
      </MapView>

      <View style={[styles.arriba, { paddingTop: insets.top + espacio.s }]} pointerEvents="box-none">
        <Text style={styles.titulo}>Cerca tuyo</Text>
        <FiltrosMapa tipo={tipo} setTipo={setTipo} total={puntos.length} />
        <View style={styles.avisos}>
          <MensajeError texto={error} onReintentar={recargar} />
          {avisoUbicacion ? <Text style={styles.aviso}>{avisoUbicacion}</Text> : null}
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Centrar el mapa en mi ubicación" onPress={centrarEnMi} style={[styles.botonUbicacion, { bottom: seleccionado ? 250 : espacio.l }]}>
        <Icono nombre="mapa" color={colores.tinta} tamano={22} />
      </Pressable>

      {seleccionado ? (
        <View style={styles.abajo}>
          <FichaPunto punto={seleccionado} onCerrar={() => setSeleccionado(null)} onVerActividad={(p) => navigation.navigate('ActividadDetalle', { id: p.id })} />
        </View>
      ) : null}
    </View>
  );
}

/** Marcador con burbuja de color + ícono. Se deja de redibujar después del primer render (rendimiento). */
function Marcador({ punto, activo, onPress }) {
  const [redibujar, setRedibujar] = useState(true);
  useEffect(() => {
    setRedibujar(true);
    const t = setTimeout(() => setRedibujar(false), 600);
    return () => clearTimeout(t);
  }, [activo]);
  return (
    <Marker
      coordinate={{ latitude: punto.ubicacion.lat, longitude: punto.ubicacion.lng }}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      tracksViewChanges={redibujar}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.marcador}>
        <View style={[styles.burbuja, { backgroundColor: colorPunto(punto) }, activo && styles.burbujaActiva]}>
          <Icono nombre={punto.tipo === 'acopio' ? 'campanas' : 'actividades'} color={colores.blanco} tamano={18} grosor={2.2} />
        </View>
        <View style={[styles.pico, { borderTopColor: colorPunto(punto) }]} />
      </View>
    </Marker>
  );
}

// Estilo oscuro para Google Maps (Android). En iOS alcanza con userInterfaceStyle.
const ESTILO_OSCURO = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c34' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a9bcc4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1c24' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c4552' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b3a4f' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  mapa: { flex: 1 },
  arriba: { position: 'absolute', top: 0, left: 0, right: 0 },
  titulo: {
    alignSelf: 'flex-start',
    marginLeft: espacio.l,
    marginBottom: espacio.s,
    fontFamily: fuentes.titulo,
    fontSize: 20,
    color: colores.tinta,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  avisos: { paddingHorizontal: espacio.l },
  aviso: { fontFamily: fuentes.textoMedio, color: colores.tinta, backgroundColor: colores.solSuave, padding: 10, borderRadius: 14, overflow: 'hidden' },
  botonUbicacion: {
    position: 'absolute',
    right: espacio.l,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra,
    shadowOpacity: 0.2,
  },
  botonUbicacionTexto: { fontSize: 24 },
  abajo: { position: 'absolute', left: espacio.l, right: espacio.l, bottom: espacio.l },
  marcador: { alignItems: 'center' },
  burbuja: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colores.blanco },
  burbujaActiva: { width: 50, height: 50, borderRadius: 25 },
  burbujaEmoji: { fontSize: 20 },
  pico: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
}));
