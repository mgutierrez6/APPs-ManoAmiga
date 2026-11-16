import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import ImagenApi from '../../components/ImagenApi';
import VisorFoto from '../../components/VisorFoto';
import { Aparecer, Avatar, Boton, Cargando, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarPublicaciones } from '../../api/comunidad';
import { colores, espacio, estilosDinamicos, fuentes, sombra, tituloGrande } from '../../constants/tema';
import { fechaHora } from '../../utils/formato';

/** Novedades de un proyecto (actividad o campaña). Las publicaciones se ven como "globos", con sus fotos. */
export default function FeedScreen({ route, navigation }) {
  const { proyectoId, titulo, organizacionId } = route.params;
  const { usuario } = useAuth();
  const [foto, setFoto] = useState(null);
  const { datos, cargando, error, recargar } = useCarga(() => listarPublicaciones(proyectoId, { limit: 50 }), [proyectoId]);

  // Mostrar el botón es solo comodidad: si no es de su organización, la API responde 403 (RS3/RS4).
  const puedePublicar = usuario.rol === 'coordinador' && usuario.organizacionId === organizacionId;

  return (
    <>
      <FlatList
        style={styles.contenedor}
        data={datos?.data || []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.lista}
        refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
        ListHeaderComponent={
          <View style={styles.encabezado}>
            <Text style={styles.encabezadoTitulo}>{titulo}</Text>
            {puedePublicar ? <Boton titulo="Publicar novedad" variante="tinta" onPress={() => navigation.navigate('Publicar', { proyectoId, titulo })} estilo={{ marginTop: espacio.m }} /> : null}
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        }
        ListEmptyComponent={cargando ? <Cargando /> : <Vacio titulo="Todavía no hay novedades" texto="Cuando la organización publique algo, lo vas a ver acá." />}
        renderItem={({ item: p, index }) => {
          return (
            <Aparecer indice={index}>
              <View style={styles.fila}>
                <Avatar nombre={p.autor?.nombre || '?'} tamano={40} />
                <View style={styles.globo}>
                  <Text style={styles.contenido}>{p.contenido}</Text>
                  {p.fotos?.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
                      {p.fotos.map((ruta) => (
                        <Pressable key={ruta} accessibilityRole="imagebutton" accessibilityLabel="Ver foto" onPress={() => setFoto(ruta)}>
                          <ImagenApi ruta={ruta} estilo={styles.miniatura} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
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
      <VisorFoto ruta={foto} onCerrar={() => setFoto(null)} />
    </>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { padding: espacio.l, flexGrow: 1 },
  encabezado: { marginBottom: espacio.l },
  encabezadoTitulo: { ...tituloGrande(30), color: colores.tinta },
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: espacio.s, marginBottom: espacio.m },
  globo: { flex: 1, backgroundColor: colores.tarjeta, borderRadius: 18, borderBottomLeftRadius: 4, padding: espacio.m, ...sombra },
  contenido: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21, color: colores.tinta },
  miniatura: { width: 72, height: 72, borderRadius: 12 },
  meta: { fontFamily: fuentes.textoMedio, color: colores.gris, fontSize: 12, marginTop: 6 },
}));
