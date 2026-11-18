import { FlatList, View } from 'react-native';
import Hero from '../../components/Hero';
import { Aparecer, Cargando, MensajeError, TextoSuave, Vacio } from '../../components/ui';
import { colores, espacio, estilosDinamicos } from '../../constants/tema';
import { FichaPunto, FiltrosMapa, usePuntos } from './comun';

/* Los mismos puntos del mapa, como lista. Se usa donde no hay mapa (web y APK de Android sin clave de Google Maps). */
export default function ListaPuntos({ navigation }) {
  const { puntos, filtros, cargando, error, recargar } = usePuntos();
  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={puntos}
      keyExtractor={(p) => `${p.tipo}-${p.id}`}
      ListHeaderComponent={
        <>
          <Hero titulo="Lugares" subtitulo="Actividades y puntos de acopio" />
          <View style={{ marginTop: espacio.m }}>
            <FiltrosMapa {...filtros} total={puntos.length} />
          </View>
          <View style={styles.relleno}>
            <TextoSuave estilo={{ marginVertical: espacio.s }}>Tocá "Cómo llegar" para ver el recorrido.</TextoSuave>
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      renderItem={({ item, index }) => (
        <Aparecer indice={index} estilo={[styles.relleno, { marginBottom: espacio.m }]}>
          <FichaPunto punto={item} onVerActividad={(p) => navigation.navigate('ActividadDetalle', { id: p.id })} />
        </Aparecer>
      )}
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No hay puntos con ese filtro." />}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.l },
}));
