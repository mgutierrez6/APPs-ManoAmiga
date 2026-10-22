import { FlatList, View } from 'react-native';
import Hero from '../../components/Hero';
import { Aparecer, Cargando, MensajeError, TextoSuave, Vacio } from '../../components/ui';
import { colores, espacio, estilosDinamicos } from '../../constants/tema';
import { FichaPunto, FiltrosMapa, usePuntos } from './comun';

/**
 * Versión web del mapa (react-native-maps no funciona en navegador): muestra los mismos puntos como
 * lista, con el botón "Cómo llegar" que abre el mapa del navegador. En el celular se ve el mapa real.
 */
export default function MapaScreen({ navigation }) {
  const { puntos, tipo, setTipo, cargando, error, recargar } = usePuntos();
  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={puntos}
      keyExtractor={(p) => `${p.tipo}-${p.id}`}
      ListHeaderComponent={
        <>
          <Hero titulo="Mapa" subtitulo="Actividades y puntos de acopio" tema="menta" figuras={1} />
          <View style={{ marginTop: espacio.m }}>
            <FiltrosMapa tipo={tipo} setTipo={setTipo} total={puntos.length} />
          </View>
          <View style={styles.relleno}>
            <TextoSuave estilo={{ marginVertical: espacio.s }}>En la app del celular estos puntos se ven sobre el mapa.</TextoSuave>
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
