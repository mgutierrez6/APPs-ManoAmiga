import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Aparecer, Avatar, Boton, Cargando, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarPublicaciones } from '../../api/comunidad';
import { colores, espacio, estilosDinamicos, fuentes, sombra } from '../../constants/tema';
import { fechaHora } from '../../utils/formato';

/** Feed / muro de un proyecto (actividad o campaña). Es público. Las publicaciones se ven como "globos". */
export default function FeedScreen({ route, navigation }) {
  const { proyectoId, titulo, organizacionId } = route.params;
  const { usuario } = useAuth();
  const { datos, cargando, error, recargar } = useCarga(() => listarPublicaciones(proyectoId, { limit: 50 }), [proyectoId]);

  // Mostrar el botón es solo comodidad: si no es de su organización, la API responde 403 (RS3/RS4).
  const puedePublicar = usuario.rol === 'coordinador' && usuario.organizacionId === organizacionId;

  return (
    <FlatList
      style={styles.contenedor}
      data={datos?.data || []}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={
        <View style={styles.encabezado}>
          <Text style={styles.encabezadoTitulo}>{titulo}</Text>
          {puedePublicar ? <Boton titulo="Publicar novedad" variante="lila" onPress={() => navigation.navigate('Publicar', { proyectoId, titulo })} estilo={{ marginTop: espacio.m }} /> : null}
          <MensajeError texto={error} onReintentar={recargar} />
        </View>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio titulo="Todavía no hay novedades" texto="Cuando la organización publique algo, lo vas a ver acá." />}
      renderItem={({ item: p, index }) => {
        const convocatoria = p.tipo === 'convocatoria';
        return (
          <Aparecer indice={index}>
            <View style={styles.fila}>
              <Avatar nombre={p.autor?.nombre || '?'} tamano={40} />
              <View style={[styles.globo, convocatoria && styles.globoConvocatoria]}>
                {convocatoria ? <Text style={styles.etiquetaConv}>CONVOCATORIA EXPRESS</Text> : null}
                <Text style={styles.contenido}>{p.contenido}</Text>
                <Text style={styles.meta}>
                  {p.autor?.nombre ? `${p.autor.nombre} · ` : ''}
                  {fechaHora(p.fecha)}
                </Text>
              </View>
            </View>
          </Aparecer>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { padding: espacio.l, flexGrow: 1 },
  encabezado: { marginBottom: espacio.l },
  encabezadoTitulo: { fontFamily: fuentes.titulo, fontSize: 26, color: colores.tinta },
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: espacio.s, marginBottom: espacio.m },
  globo: { flex: 1, backgroundColor: colores.tarjeta, borderRadius: 22, borderBottomLeftRadius: 6, padding: espacio.m, ...sombra },
  globoConvocatoria: { backgroundColor: colores.solSuave, borderWidth: 2, borderColor: colores.sol },
  etiquetaConv: { fontFamily: fuentes.negrita, color: colores.solTexto, fontSize: 12, marginBottom: 4, letterSpacing: 0.5 },
  contenido: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21, color: colores.tinta },
  meta: { fontFamily: fuentes.textoMedio, color: colores.gris, fontSize: 12, marginTop: 6 },
}));
