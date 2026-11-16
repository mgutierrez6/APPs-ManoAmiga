import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono from '../../components/Icono';
import { Cargando, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { historiasPendientes } from '../../api/historias';
import { colores, espacio, estilosDinamicos, fuentes, paletas, tituloGrande } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { diaMes } from '../../utils/formato';

/** "Por agregar": actividades a las que la persona fue (tiene asistencia) y todavía no contó. */
export default function HistoriasPendientesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { datos, cargando, error, recargar } = useCarga(() => historiasPendientes(), []);
  const lista = datos || [];

  return (
    <FlatList
      style={styles.contenedor}
      data={lista}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ paddingTop: insets.top + espacio.l, paddingBottom: insets.bottom + espacio.xxl, paddingHorizontal: espacio.xl }}
      ListHeaderComponent={
        <View style={{ marginBottom: espacio.l }}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.volver} hitSlop={8}>
            <Icono nombre="izquierda" color={colores.tintaSuave} tamano={18} />
            <Text style={styles.volverTexto}>Mi historia</Text>
          </Pressable>
          <Text style={styles.titulo}>Por agregar</Text>
          <Text style={styles.texto}>Actividades a las que fuiste y todavía no contaste. Ya completamos la fecha y el lugar: solo te falta contar qué hiciste.</Text>
          <MensajeError texto={error} onReintentar={recargar} />
        </View>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio titulo="¡Contaste todas!" texto="Cuando vayas a otra actividad, va a aparecer acá." />}
      renderItem={({ item: a }) => {
        const t = estiloTipo(a.tipo);
        const { dia, mes } = diaMes(a.fechaInicio);
        return (
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ContarHistoria', { actividad: a })} style={({ pressed }) => [styles.fila, pressed && { opacity: 0.8 }]}>
            <View style={[styles.icono, { backgroundColor: t.esTipo ? t.color : colores.pista }]}>
              <Icono nombre={t.icono} color={paletas.claro.tinta} tamano={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filaTitulo} numberOfLines={2}>
                {a.titulo}
              </Text>
              <Text style={styles.filaTexto} numberOfLines={1}>
                {dia} {mes.toLowerCase()}
                {a.organizacion?.nombre ? ` · ${a.organizacion.nombre}` : ''}
              </Text>
            </View>
            <Text style={styles.contar}>Contar →</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volverTexto: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave },
  titulo: { ...tituloGrande(44), color: colores.tinta, marginTop: espacio.m },
  texto: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.tintaSuave, marginTop: espacio.s },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 20, padding: 12, marginBottom: 10 },
  icono: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  filaTexto: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaSuave, marginTop: 2 },
  contar: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.coral },
}));
