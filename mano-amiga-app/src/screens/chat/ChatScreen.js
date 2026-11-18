import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono from '../../components/Icono';
import { Cargando, MensajeError } from '../../components/ui';
import { borrarMensaje, enviarMensaje, leerMensajes } from '../../api/chat';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { hora } from '../../utils/formato';

const CADA_MS = 5000; // mientras el chat está abierto, busca mensajes nuevos cada 5 s
const RECARGA_COMPLETA = 12; // cada 12 vueltas (~1 min) recarga todo, para ver los mensajes borrados

/**
 * Chat de la actividad: solo inscriptos aceptados y coordinadores de la organización.
 * La API controla quién entra; si alguien sin permiso llega acá, ve el error que devuelve la API.
 * Los mensajes propios van a la derecha; los del coordinador llevan la marca "Coordinación".
 * Mantener apretado un mensaje (propio, o cualquiera si sos coordinador) permite borrarlo.
 */
export default function ChatScreen({ route, navigation }) {
  const { id, titulo, tipo } = route.params;
  const t = estiloTipo(tipo);
  const insets = useSafeAreaInsets();
  const [mensajes, setMensajes] = useState(null);
  const [estado, setEstado] = useState({ puedeEscribir: true, soloLectura: null });
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ultimo = useRef(null);
  const vueltas = useRef(0);

  const recibir = useCallback((r, completo) => {
    setEstado({ puedeEscribir: r.puedeEscribir, soloLectura: r.soloLectura });
    setMensajes((previos) => {
      if (completo || !previos) return r.data;
      const ids = new Set(previos.map((m) => m.id));
      const nuevos = r.data.filter((m) => !ids.has(m.id));
      return nuevos.length ? [...previos, ...nuevos] : previos;
    });
    const fin = r.data[r.data.length - 1];
    if (fin && (completo || !ultimo.current || fin.fecha > ultimo.current)) ultimo.current = fin.fecha;
  }, []);

  const cargarTodo = useCallback(async () => {
    try {
      recibir(await leerMensajes(id), true);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [id, recibir]);

  // Al entrar (y al volver a la pantalla) carga todo; después, mientras está abierta, solo lo nuevo.
  const [enFoco, setEnFoco] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setEnFoco(true);
      cargarTodo();
      return () => setEnFoco(false);
    }, [cargarTodo])
  );

  useEffect(() => {
    if (!enFoco || error) return undefined;
    const reloj = setInterval(async () => {
      vueltas.current += 1;
      if (vueltas.current % RECARGA_COMPLETA === 0) return cargarTodo();
      try {
        recibir(await leerMensajes(id, ultimo.current), false);
      } catch {
        // sin conexión por un momento: se reintenta en la próxima vuelta
      }
    }, CADA_MS);
    return () => clearInterval(reloj);
  }, [enFoco, error, id, cargarTodo, recibir]);

  const mandar = async () => {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    try {
      const m = await enviarMensaje(id, limpio);
      setTexto('');
      setMensajes((previos) => (previos || []).concat(previos?.some((x) => x.id === m.id) ? [] : [m]));
      ultimo.current = m.fecha;
    } catch (e) {
      Alert.alert('No se pudo mandar', mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const ofrecerBorrar = (m) => {
    if (!m.puedoBorrar) return;
    Alert.alert('Borrar mensaje', m.mio ? '¿Querés borrar tu mensaje?' : 'Vas a borrar este mensaje para todo el grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await borrarMensaje(m.id);
            setMensajes((previos) => previos.map((x) => (x.id === m.id ? { ...x, borrado: true, texto: null, puedoBorrar: false } : x)));
          } catch (e) {
            Alert.alert('No se pudo borrar', mensajeDeError(e));
          }
        },
      },
    ]);
  };

  // La lista está invertida (lo más nuevo abajo, pegado al campo de texto).
  const invertidos = mensajes ? [...mensajes].reverse() : [];

  return (
    <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.cabecera, { paddingTop: insets.top + espacio.s, backgroundColor: t.clarito }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={styles.atras}>
          <Icono nombre="izquierda" color={colores.tintaFija} tamano={20} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.antetitulo}>Chat del grupo</Text>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo || 'Actividad'}
          </Text>
        </View>
      </View>

      {mensajes === null && !error ? (
        <Cargando />
      ) : error && !mensajes ? (
        <View style={{ padding: espacio.l }}>
          <MensajeError texto={error} onReintentar={cargarTodo} />
        </View>
      ) : (
        <FlatList
          inverted
          data={invertidos}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>Todavía no hay mensajes. ¡Saludá al grupo!</Text>
            </View>
          }
          renderItem={({ item: m, index }) => {
            // El nombre se muestra solo cuando cambia quién escribe (la lista está invertida).
            const anterior = invertidos[index + 1];
            const mostrarNombre = !m.mio && (!anterior || anterior.autor.nombre !== m.autor.nombre || anterior.mio);
            return (
              <Pressable onLongPress={() => ofrecerBorrar(m)} delayLongPress={350} style={[styles.fila, m.mio && styles.filaMia]}>
                <View style={[styles.burbuja, m.mio ? styles.burbujaMia : styles.burbujaOtra, m.borrado && styles.burbujaBorrada]}>
                  {mostrarNombre ? (
                    <Text style={styles.autor}>
                      {m.autor.nombre}
                      {m.autor.esCoordinador ? <Text style={styles.coord}> · Coordinación</Text> : null}
                    </Text>
                  ) : null}
                  <Text style={[styles.texto, m.mio && styles.sobreColor, m.borrado && styles.textoBorrado]}>{m.borrado ? 'Mensaje eliminado' : m.texto}</Text>
                  <Text style={[styles.hora, m.mio && !m.borrado && styles.sobreColor]}>{hora(m.fecha)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {estado.puedeEscribir ? (
        <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, espacio.s) + 4 }]}>
          <TextInput
            style={styles.campo}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribí un mensaje"
            placeholderTextColor={colores.gris}
            multiline
            maxLength={1000}
            accessibilityLabel="Mensaje"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mandar"
            onPress={mandar}
            disabled={!texto.trim() || enviando}
            style={[styles.enviar, (!texto.trim() || enviando) && { opacity: 0.45 }]}
          >
            {enviando ? <ActivityIndicator color={colores.tintaFija} /> : <Icono nombre="enviar" color={colores.tintaFija} tamano={20} grosor={2.1} />}
          </Pressable>
        </View>
      ) : estado.soloLectura ? (
        <View style={[styles.cerrado, { paddingBottom: Math.max(insets.bottom, espacio.m) + 4 }]}>
          <Icono nombre="reloj" color={colores.tintaSuave} tamano={18} />
          <Text style={styles.cerradoTexto}>{estado.soloLectura}</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: espacio.l, paddingBottom: espacio.m },
  atras: { width: 40, height: 40, borderRadius: 20, backgroundColor: colores.crema, alignItems: 'center', justifyContent: 'center' },
  antetitulo: { fontFamily: fuentes.textoMedio, fontSize: 12, color: colores.tintaFija },
  titulo: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tintaFija },

  lista: { padding: espacio.l, flexGrow: 1 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl },
  vacioTexto: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave, textAlign: 'center' },

  fila: { flexDirection: 'row', marginVertical: 3 },
  filaMia: { justifyContent: 'flex-end' },
  burbuja: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  burbujaMia: { backgroundColor: colores.sol, borderBottomRightRadius: 6 },
  burbujaOtra: { backgroundColor: colores.tarjeta, borderBottomLeftRadius: 6 },
  burbujaBorrada: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.borde },
  autor: { fontFamily: fuentes.negrita, fontSize: 12.5, color: colores.coralTexto, marginBottom: 2 },
  coord: { fontFamily: fuentes.semi, color: colores.tintaSuave },
  texto: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21, color: colores.tinta },
  sobreColor: { color: colores.tintaFija }, // sobre el amarillo, siempre azul oscuro
  textoBorrado: { fontStyle: 'italic', color: colores.tintaSuave },
  hora: { fontFamily: fuentes.texto, fontSize: 10.5, color: colores.tintaSuave, alignSelf: 'flex-end', marginTop: 2 },

  barra: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: espacio.l, paddingTop: 10, backgroundColor: colores.tarjeta, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  campo: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, backgroundColor: colores.crema, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: fuentes.texto, fontSize: 15, color: colores.tinta },
  enviar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colores.sol, alignItems: 'center', justifyContent: 'center' },
  cerrado: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: espacio.l, paddingTop: espacio.m, borderTopWidth: 1, borderTopColor: colores.linea },
  cerradoTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: 13.5, color: colores.tintaSuave },
}));
