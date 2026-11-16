import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aparecer, BotonPastilla, Cargando, MensajeError, Vacio } from '../../components/ui';
import Icono from '../../components/Icono';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarCampanas } from '../../api/comunidad';
import { colores, espacio, estilosDinamicos, fuentes, tituloGrande } from '../../constants/tema';
import { fechaHora } from '../../utils/formato';

/**
 * Campañas de donación (puntos de acopio). Voluntario: se entra desde la card amarilla de
 * Actividades. Coordinador: es una pestaña del menú de abajo.
 */
export default function CampanasScreen({ navigation, route }) {
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const { datos, cargando, error, recargar } = useCarga(() => listarCampanas({ limit: 50 }), []);
  const esCoord = usuario.rol === 'coordinador';
  const esPestana = route?.name === 'CampanasCoord'; // en el coordinador es una pestaña del menú: sin "volver"

  return (
    <FlatList
      style={styles.contenedor}
      data={datos?.data || []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={[styles.lista, { paddingTop: insets.top + espacio.l }]}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={
        <View style={styles.relleno}>
          <View style={styles.arriba}>
            {esPestana ? <View /> : (
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.volver} hitSlop={8}>
              <Icono nombre="izquierda" color={colores.tintaSuave} tamano={18} />
              <Text style={styles.volverTexto}>Inicio</Text>
            </Pressable>
            )}
            {esCoord ? <BotonPastilla titulo="Nueva campaña" icono="mas" primario onPress={() => navigation.navigate('CrearCampana')} /> : null}
          </View>
          <Text style={styles.ante}>Donar también es dar una mano</Text>
          <Text style={styles.titulo}>Campañas</Text>
          <MensajeError texto={error} onReintentar={recargar} />
        </View>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No hay campañas de donación activas en este momento." />}
      renderItem={({ item: c, index }) => {
        const destacada = index === 0;
        return (
          <Aparecer indice={index} estilo={styles.relleno}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Feed', { proyectoId: c.id, titulo: c.titulo, organizacionId: c.organizacion.id })}
              style={[styles.tarjeta, destacada && styles.destacada]}
            >
              {destacada ? (
                <Text style={styles.numeroFondo} aria-hidden>
                  {c.puntos.length}
                </Text>
              ) : null}
              <View style={[styles.puntos, destacada && styles.puntosDestacada]}>
                <Text style={[styles.puntosTexto, destacada && { color: '#FFFFFF' }]}>
                  {c.puntos.length} {c.puntos.length === 1 ? 'punto de acopio' : 'puntos de acopio'}
                </Text>
              </View>
              <Text style={[styles.tituloCampana, destacada && styles.textoFijo]}>{c.titulo}</Text>
              <Text style={[styles.descripcion, destacada && styles.textoFijo]} numberOfLines={3}>
                {c.objetivo ? `${c.objetivo} · ` : ''}hasta el {fechaHora(c.fechaFin).split(' · ')[0]}
              </Text>
              {c.puntos.slice(0, destacada ? 3 : 1).map((p) => (
                <View key={p.id} style={styles.punto}>
                  <Icono nombre="mapa" color={destacada ? colores.tintaFija : colores.coral} tamano={16} />
                  <Text style={[styles.puntoNombre, destacada && styles.textoFijo]} numberOfLines={1}>
                    {p.nombre}
                  </Text>
                </View>
              ))}
              <View style={[styles.pie, destacada && { borderTopColor: colores.tintaFija }]}>
                <Text style={[styles.pieTexto, destacada && styles.textoFijo]} numberOfLines={1}>
                  {c.organizacion?.nombre}
                </Text>
                <Text style={[styles.pieTexto, destacada && styles.textoFijo]}>Novedades →</Text>
              </View>
            </Pressable>
          </Aparecer>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.xl },
  arriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volverTexto: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave },
  ante: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave, marginTop: espacio.l },
  titulo: { ...tituloGrande(48), color: colores.tinta, marginTop: 6, marginBottom: espacio.l },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 24, padding: 18, marginBottom: 12, gap: 8, overflow: 'hidden' },
  destacada: { backgroundColor: colores.sol, borderRadius: 28, padding: 20 },
  numeroFondo: { position: 'absolute', right: -14, top: -40, fontFamily: fuentes.numero, fontSize: 150, color: '#FFFFFF', opacity: 0.4 },
  puntos: { alignSelf: 'flex-start' },
  puntosDestacada: { backgroundColor: colores.tintaFija, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  puntosTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.tintaSuave },
  tituloCampana: { fontFamily: fuentes.tituloMedio, fontSize: 22, lineHeight: 25, letterSpacing: -0.5, color: colores.tinta },
  descripcion: { fontFamily: fuentes.texto, fontSize: 13.5, lineHeight: 19, color: colores.tintaSuave },
  textoFijo: { color: colores.tintaFija },
  punto: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntoNombre: { flex: 1, fontFamily: fuentes.semi, fontSize: 13, color: colores.tinta },
  pie: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderTopWidth: 1.5, borderTopColor: colores.linea, paddingTop: 10, marginTop: 4 },
  pieTexto: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.tinta, flexShrink: 1 },
}));
