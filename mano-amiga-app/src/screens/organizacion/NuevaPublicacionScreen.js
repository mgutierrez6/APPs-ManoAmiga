import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Pantalla from '../../components/Pantalla';
import ImagenApi from '../../components/ImagenApi';
import Icono from '../../components/Icono';
import { Boton, Campo, Cargando, MensajeError, Subtitulo, TextoSuave, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { publicarEnMiOrganizacion, realizadasDeMiOrganizacion } from '../../api/organizaciones';
import { mensajeDeError } from '../../api/client';
import { elegirYSubir } from '../../utils/fotos';
import { colores, espacio, estilosDinamicos, fuentes, tituloGrande } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { diaMes } from '../../utils/formato';

const MAX_FOTOS = 10;

/**
 * Nueva publicación en el perfil de la organización: el coordinador elige una actividad que YA se
 * realizó, suma fotos (hasta 10) y un texto. La API controla que la actividad sea de su organización.
 */
export default function NuevaPublicacionScreen({ route, navigation }) {
  const realizadas = useCarga(() => realizadasDeMiOrganizacion(), []);
  const [actividadId, setActividadId] = useState(route.params?.actividadId || null);
  const [fotos, setFotos] = useState([]);
  const [texto, setTexto] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const agregarFotos = async () => {
    setSubiendo(true);
    try {
      const nuevas = await elegirYSubir('publicacion', { multiples: true, limite: MAX_FOTOS - fotos.length });
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch (e) {
      Alert.alert('No se pudo subir la foto', mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  };

  const publicar = async () => {
    if (!actividadId) return setError('Elegí sobre qué actividad es la publicación.');
    if (!texto.trim()) return setError('Escribí unas palabras sobre la actividad.');
    setEnviando(true);
    setError(null);
    try {
      await publicarEnMiOrganizacion({ actividadId, contenido: texto.trim(), fotos: fotos.map((f) => f.id) });
      navigation.goBack();
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  const lista = realizadas.datos || [];

  return (
    <Pantalla>
      <Text style={styles.titulo}>¿De qué actividad?</Text>
      <TextoSuave>Solo aparecen las que ya se realizaron.</TextoSuave>
      <MensajeError texto={error || realizadas.error} onReintentar={realizadas.error ? realizadas.recargar : undefined} />
      <View style={{ gap: 8, marginTop: espacio.m }}>
        {realizadas.cargando && !realizadas.datos ? <Cargando /> : null}
        {!realizadas.cargando && lista.length === 0 ? <Vacio titulo="Todavía no hay actividades realizadas" texto="Cuando termine una actividad de tu organización vas a poder publicar sus fotos." /> : null}
        {lista.slice(0, 8).map((a) => {
          const elegida = a.id === actividadId;
          const { dia, mes } = diaMes(a.fechaInicio);
          const t = estiloTipo(a.tipo);
          return (
            <Pressable
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegida }}
              onPress={() => setActividadId(a.id)}
              style={[styles.opcion, elegida && styles.opcionElegida]}
            >
              <View style={[styles.punto, { backgroundColor: t.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.opcionTitulo} numberOfLines={1}>
                  {a.titulo}
                </Text>
                <Text style={styles.opcionTexto}>
                  {dia} {mes.toLowerCase()} · {a.participantes} {a.participantes === 1 ? 'voluntario' : 'voluntarios'}
                  {a.publicada ? ' · ya publicada' : ''}
                </Text>
              </View>
              {elegida ? (
                <View style={styles.check}>
                  <Icono nombre="check" color="#FFFFFF" tamano={14} grosor={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Subtitulo>
        Fotos <Text style={styles.contador}>{fotos.length} de {MAX_FOTOS}</Text>
      </Subtitulo>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {fotos.map((f) => (
          <Pressable key={f.id} accessibilityLabel="Quitar foto" onLongPress={() => setFotos((l) => l.filter((x) => x.id !== f.id))}>
            <ImagenApi ruta={f.url} estilo={styles.miniatura} />
          </Pressable>
        ))}
        {fotos.length < MAX_FOTOS ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Agregar fotos" onPress={agregarFotos} disabled={subiendo} style={styles.agregar}>
            <Icono nombre="camara" color={colores.tintaSuave} tamano={22} />
            <Text style={styles.agregarTexto}>{subiendo ? 'Subiendo…' : 'Agregar'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {fotos.length ? <TextoSuave estilo={{ marginTop: 6 }}>Mantené apretada una foto para sacarla.</TextoSuave> : null}

      <Subtitulo>Texto</Subtitulo>
      <Campo value={texto} onChangeText={setTexto} multiline maxLength={2000} placeholder="¡Gracias a todos los que vinieron!" />
      <Boton titulo="Publicar" onPress={publicar} cargando={enviando} deshabilitado={subiendo} />
    </Pantalla>
  );
}

const styles = estilosDinamicos(() => ({
  titulo: { ...tituloGrande(34), color: colores.tinta, marginBottom: 4 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 18, borderWidth: 1.5, borderColor: colores.borde, padding: 12 },
  opcionElegida: { borderWidth: 2, borderColor: colores.coral },
  punto: { width: 12, height: 12, borderRadius: 6 },
  opcionTitulo: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  opcionTexto: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaSuave, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: colores.coral, alignItems: 'center', justifyContent: 'center' },
  contador: { fontFamily: fuentes.textoMedio, fontSize: 14, color: colores.tintaSuave },
  miniatura: { width: 78, height: 78, borderRadius: 14 },
  agregar: { width: 78, height: 78, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: colores.borde, alignItems: 'center', justifyContent: 'center', gap: 2 },
  agregarTexto: { fontFamily: fuentes.negrita, fontSize: 11, color: colores.tintaSuave },
}));
