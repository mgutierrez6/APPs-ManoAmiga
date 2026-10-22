import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Hero from '../../components/Hero';
import { Aparecer, Boton, Cargando, MensajeError, Tarjeta, TextoSuave, Vacio } from '../../components/ui';
import Icono from '../../components/Icono';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarCampanas } from '../../api/comunidad';
import { colores, espacio, estilosDinamicos, familiaPara, fuentes } from '../../constants/tema';
import { rangoFechas } from '../../utils/formato';

export default function CampanasScreen({ navigation }) {
  const { usuario } = useAuth();
  const { datos, cargando, error, recargar } = useCarga(() => listarCampanas({ limit: 50 }), []);

  return (
    <FlatList
      style={styles.contenedor}
      data={datos?.data || []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={
        <>
          <Hero titulo="Campañas de donación" subtitulo="Llevá lo que puedas a un punto de acopio" tema="sol" figuras={2} />
          <View style={styles.relleno}>
            {usuario.rol === 'coordinador' ? <Boton titulo="Nueva campaña" variante="lila" onPress={() => navigation.navigate('CrearCampana')} /> : null}
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No hay campañas de donación activas en este momento." />}
      renderItem={({ item: c, index }) => {
        const f = familiaPara(c.id);
        return (
          <Aparecer indice={index} estilo={styles.relleno}>
            <Tarjeta onPress={() => navigation.navigate('Feed', { proyectoId: c.id, titulo: c.titulo, organizacionId: c.organizacion.id })} estilo={styles.tarjeta}>
              <View style={[styles.banda, { backgroundColor: f.base }]}>
                <Text style={[styles.titulo, { color: f.texto }]}>{c.titulo}</Text>
                <Text style={[styles.org, { color: f.texto }]}>{c.organizacion?.nombre}</Text>
              </View>
              <View style={styles.cuerpo}>
                {c.objetivo ? (
                  <View style={[styles.objetivo, { backgroundColor: f.suave }]}>
                    <Text style={styles.objetivoTexto}>{c.objetivo}</Text>
                  </View>
                ) : null}
                <Text style={styles.descripcion} numberOfLines={3}>
                  {c.descripcion}
                </Text>
                <TextoSuave>{rangoFechas(c.fechaInicio, c.fechaFin)}</TextoSuave>
                {c.puntos.map((p) => (
                  <View key={p.id} style={styles.punto}>
                    <Icono nombre="campanas" color={f.oscuro} tamano={20} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.puntoNombre}>{p.nombre}</Text>
                      {p.direccion ? <TextoSuave>{p.direccion}</TextoSuave> : null}
                    </View>
                  </View>
                ))}
                <Text style={[styles.verMas, { color: f.oscuro }]}>Ver novedades →</Text>
              </View>
            </Tarjeta>
          </Aparecer>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.l, paddingTop: espacio.s },
  tarjeta: { padding: 0, overflow: 'hidden' },
  banda: { padding: espacio.l, paddingTop: espacio.xl, overflow: 'hidden' },
  bandaBlob: { position: 'absolute', top: -40, right: -30 },
  bandaDestello: { position: 'absolute', top: 14, right: 70 },
  titulo: { fontFamily: fuentes.titulo, fontSize: 22 },
  org: { fontFamily: fuentes.textoMedio, marginTop: 2 },
  cuerpo: { padding: espacio.l },
  objetivo: { alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginBottom: espacio.s },
  objetivoTexto: { fontFamily: fuentes.negrita, color: colores.tinta },
  descripcion: { fontFamily: fuentes.texto, color: colores.tinta, fontSize: 15, lineHeight: 21, marginBottom: espacio.s },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: espacio.s, backgroundColor: colores.crema, borderRadius: 14, padding: 10 },
  puntoEmoji: { fontSize: 18 },
  puntoNombre: { fontFamily: fuentes.negrita, color: colores.tinta },
  verMas: { fontFamily: fuentes.negrita, marginTop: espacio.m, textAlign: 'right' },
}));
