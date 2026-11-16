import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono from '../../components/Icono';
import ImagenApi from '../../components/ImagenApi';
import FondoTipo from '../../components/FondoTipo';
import { PastillaFecha } from '../../components/CartaHistoria';
import { crearHistoria } from '../../api/historias';
import { mensajeDeError } from '../../api/client';
import { elegirYSubir } from '../../utils/fotos';
import { estilosDinamicos, fuentes, paletas } from '../../constants/tema';

const MAX_FOTOS = 20;
const P = paletas.claro; // la carta es "papel" claro también en modo oscuro

/**
 * Contar una actividad en "Mi historia". La fecha, el nombre, el lugar y la organización ya vienen
 * completados: la persona solo escribe qué hizo y, si quiere, suma fotos.
 */
export default function ContarHistoriaScreen({ route, navigation }) {
  const { actividad } = route.params;
  const insets = useSafeAreaInsets();
  const [relato, setRelato] = useState('');
  const [fotos, setFotos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const agregarFotos = async () => {
    setSubiendo(true);
    try {
      const nuevas = await elegirYSubir('historia', { multiples: true, limite: MAX_FOTOS - fotos.length });
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch (e) {
      Alert.alert('No se pudo subir la foto', mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await crearHistoria({ actividadId: actividad.id, relato: relato.trim(), fotos: fotos.map((f) => f.id) });
      // Vuelve a la Mi historia original (saca "Por agregar" y este formulario de la pila): ahí se recarga con la nueva.
      navigation.popTo('MiHistoria');
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FondoTipo tipo={actividad.tipo} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.barra, { paddingTop: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => navigation.goBack()} style={styles.circulo}>
            <Icono nombre="cerrar" color={P.tinta} tamano={18} />
          </Pressable>
          <View style={styles.pildora}>
            <Text style={styles.pildoraTexto}>Nueva historia</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.carta}>
            <PastillaFecha tipo={actividad.tipo} fecha={actividad.fechaInicio} />
            <Text style={styles.titulo}>{actividad.titulo}</Text>
            {actividad.direccion ? <Text style={styles.dato}>{actividad.direccion}</Text> : null}
            {actividad.organizacion?.nombre ? (
              <Text style={styles.dato}>
                Organizó <Text style={{ fontFamily: fuentes.negrita, color: P.tinta }}>{actividad.organizacion.nombre}</Text>
              </Text>
            ) : null}

            <View style={styles.seccion}>
              <Text style={styles.etiqueta}>¿Qué hiciste ese día?</Text>
              <TextInput
                value={relato}
                onChangeText={setRelato}
                multiline
                maxLength={1000}
                placeholder="Contá qué hiciste, a quién conociste, qué te llevaste…"
                placeholderTextColor={P.gris}
                style={styles.input}
              />
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.etiqueta}>
                Fotos <Text style={styles.opcional}>(opcional)</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                {fotos.map((f) => (
                  <Pressable key={f.id} accessibilityLabel="Quitar foto" onLongPress={() => setFotos((l) => l.filter((x) => x.id !== f.id))}>
                    <ImagenApi ruta={f.url} estilo={styles.miniatura} />
                  </Pressable>
                ))}
                {fotos.length < MAX_FOTOS ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Agregar fotos" onPress={agregarFotos} disabled={subiendo} style={styles.agregar}>
                    <Icono nombre="camara" color={P.tintaSuave} tamano={22} />
                    <Text style={styles.agregarTexto}>{subiendo ? 'Subiendo…' : 'Agregar'}</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
          <Pressable accessibilityRole="button" onPress={guardar} disabled={guardando || subiendo} style={({ pressed }) => [styles.guardar, (pressed || guardando) && { opacity: 0.8 }]}>
            <Text style={styles.guardarTexto}>{guardando ? 'Guardando…' : 'Guardar en mi historia'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  circulo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pildora: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pildoraTexto: { fontFamily: fuentes.negrita, fontSize: 13, color: P.tinta },
  carta: { backgroundColor: '#FFFFFF', borderRadius: 30, padding: 22 },
  titulo: { fontFamily: fuentes.negrita, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: P.tinta, marginTop: 12 },
  dato: { fontFamily: fuentes.texto, fontSize: 13, color: P.tintaSuave, marginTop: 6 },
  seccion: { marginTop: 16, paddingTop: 14, borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: P.borde },
  etiqueta: { fontFamily: fuentes.negrita, fontSize: 13.5, color: P.tinta },
  opcional: { fontFamily: fuentes.texto, color: P.tintaSuave },
  input: { marginTop: 8, minHeight: 100, borderWidth: 1.5, borderColor: P.borde, borderRadius: 16, padding: 12, fontFamily: fuentes.texto, fontSize: 14.5, lineHeight: 21, color: P.tinta, backgroundColor: P.crema, textAlignVertical: 'top' },
  miniatura: { width: 78, height: 78, borderRadius: 14 },
  agregar: { width: 78, height: 78, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: P.borde, alignItems: 'center', justifyContent: 'center', gap: 2 },
  agregarTexto: { fontFamily: fuentes.negrita, fontSize: 11, color: P.tintaSuave },
  guardar: { height: 56, borderRadius: 18, backgroundColor: P.tinta, alignItems: 'center', justifyContent: 'center' },
  guardarTexto: { fontFamily: fuentes.negrita, fontSize: 16, color: '#FFFFFF' },
}));
