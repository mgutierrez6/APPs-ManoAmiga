import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Icono from '../../components/Icono';
import { Boton, Chip, TextoSuave } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { puntosDelMapa } from '../../api/mapa';
import { listarEtiquetas } from '../../api/actividades';
import { listarCampanas } from '../../api/comunidad';
import { colores, espacio, estilosDinamicos, fuentes, sombra } from '../../constants/tema';
import { rangoFechas, fechaHora } from '../../utils/formato';

export const FILTROS = [
  { valor: 'todos', texto: 'Todo' },
  { valor: 'actividad', texto: 'Actividades' },
  { valor: 'acopio', texto: 'Puntos de acopio' },
];

// Centro por defecto: Montevideo.
export const REGION_INICIAL = { latitude: -34.8941, longitude: -56.1525, latitudeDelta: 0.16, longitudeDelta: 0.16 };

export const iconoPunto = (p) => (p.tipo === 'acopio' ? 'campanas' : 'actividades');
export const colorPunto = (p) => (p.tipo === 'acopio' ? colores.menta : colores.coral);

/* Carga los puntos con los filtros elegidos (R5: tipo, etiqueta y campaña).
 Los datos de la persona NO viajan al servidor (RS7): ni su ubicación ni nada suyo.
 */
export function usePuntos() {
  const [tipo, setTipoBase] = useState('todos');
  const [etiqueta, setEtiqueta] = useState(null); // solo aplica a actividades
  const [campana, setCampana] = useState(null); // solo aplica a puntos de acopio
  // Al cambiar de tipo se limpia el sub-filtro, que puede no tener sentido para el tipo nuevo.
  const setTipo = (t) => {
    setTipoBase(t);
    setEtiqueta(null);
    setCampana(null);
  };
  const carga = useCarga(() => puntosDelMapa({ tipo, etiqueta: etiqueta || undefined, campana: campana || undefined }), [tipo, etiqueta, campana]);
  const puntos = useMemo(() => carga.datos?.data || [], [carga.datos]);
  const filtros = { tipo, setTipo, etiqueta, setEtiqueta, campana, setCampana };
  return { ...carga, ...filtros, filtros, puntos };
}

export function abrirComoLlegar(p) {
  const { lat, lng } = p.ubicacion;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url);
}

export function FiltrosMapa({ tipo, setTipo, etiqueta, setEtiqueta, campana, setCampana, total }) {
  const etiquetas = useCarga(listarEtiquetas, []);
  const campanas = useCarga(() => listarCampanas({ limit: 50 }), []);
  // Segunda fila: etiquetas si se ven actividades, campañas si se ven puntos de acopio.
  // Tocar un chip ya elegido lo desmarca.
  const opciones =
    tipo === 'actividad'
      ? (etiquetas.datos || []).map((e) => ({ id: e.id, texto: e.nombre, activo: etiqueta === e.id, elegir: () => setEtiqueta(etiqueta === e.id ? null : e.id) }))
      : tipo === 'acopio'
        ? (campanas.datos?.data || []).map((c) => ({ id: c.id, texto: c.titulo, activo: campana === c.id, elegir: () => setCampana(campana === c.id ? null : c.id) }))
        : [];
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {FILTROS.map((f) => (
          <Chip key={f.valor} texto={f.valor === tipo && total != null ? `${f.texto} · ${total}` : f.texto} clave={f.valor} activo={tipo === f.valor} onPress={() => setTipo(f.valor)} />
        ))}
      </ScrollView>
      {opciones.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
          {opciones.map((o) => (
            <Chip key={o.id} texto={o.texto} clave={o.id} activo={o.activo} onPress={o.elegir} />
          ))}
        </ScrollView>
      ) : null}
    </>
  );
}

/** Ficha de un punto (se muestra al tocar un marcador, o como elemento de la lista en web). */
export function FichaPunto({ punto, onVerActividad, onCerrar }) {
  const esActividad = punto.tipo === 'actividad';
  return (
    <View style={styles.ficha}>
      <View style={styles.fichaFila}>
        <View style={[styles.fichaIcono, { backgroundColor: esActividad ? colores.coralSuave : colores.mentaSuave }]}>
          <Icono nombre={iconoPunto(punto)} color={esActividad ? colores.coralTexto : colores.mentaTexto} tamano={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fichaTitulo} numberOfLines={2}>
            {punto.titulo}
          </Text>
          <TextoSuave numberOfLines={1}>{esActividad ? punto.organizacion : `${punto.campana} · ${punto.organizacion}`}</TextoSuave>
        </View>
        {onCerrar ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onCerrar} style={styles.cerrar} hitSlop={10}>
            <Icono nombre="cerrar" color={colores.tintaSuave} tamano={20} />
          </Pressable>
        ) : null}
      </View>
      {punto.direccion ? <TextoSuave>{punto.direccion}</TextoSuave> : null}
      <TextoSuave>{esActividad ? `${rangoFechas(punto.fechaInicio, punto.fechaFin)}` : `Recibe donaciones hasta el ${fechaHora(punto.fechaFin)}`}</TextoSuave>
      {esActividad ? <TextoSuave>{punto.cuposLibres > 0 ? `${punto.cuposLibres} cupos libres` : 'Sin cupos libres'}</TextoSuave> : null}
      <View style={styles.botones}>
        {esActividad && onVerActividad ? <Boton titulo="Ver actividad" chico onPress={() => onVerActividad(punto)} estilo={{ flex: 1 }} /> : null}
        <Boton titulo="Cómo llegar" chico variante="borde" onPress={() => abrirComoLlegar(punto)} estilo={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  filtros: { paddingHorizontal: espacio.l, paddingTop: 2 },
  ficha: { backgroundColor: colores.tarjeta, borderRadius: 26, padding: espacio.l, ...sombra, shadowOpacity: 0.18, gap: 4 },
  fichaFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginBottom: 6 },
  fichaIcono: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fichaTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta },
  cerrar: { fontFamily: fuentes.negrita, fontSize: 18, color: colores.gris, padding: 6 },
  botones: { flexDirection: 'row', gap: espacio.s, marginTop: espacio.s },
}));
