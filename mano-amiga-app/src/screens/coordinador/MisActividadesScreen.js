import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import ActividadCard from '../../components/ActividadCard';
import Hero from '../../components/Hero';
import { Boton, Cargando, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarActividades } from '../../api/actividades';
import { colores, espacio, estilosDinamicos } from '../../constants/tema';

/** Actividades de la organización del coordinador (la API toma la organización del token). */
export default function MisActividadesScreen({ navigation }) {
  const { usuario } = useAuth();
  const { datos, cargando, error, recargar } = useCarga(() => listarActividades({ mias: true, limit: 50 }), []);
  const lista = datos?.data || [];
  const publicadas = lista.filter((a) => a.estado === 'publicada').length;

  return (
    <FlatList
      style={styles.contenedor}
      data={lista}
      keyExtractor={(a) => a.id}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={
        <>
          <Hero
            titulo={`¡Hola, ${usuario.nombre}!`}
            subtitulo={lista.length ? `Tu organización tiene ${publicadas} ${publicadas === 1 ? 'actividad publicada' : 'actividades publicadas'}` : 'Creá la primera actividad de tu organización'}
           
            tema="oceano"
            figuras={0}
          />
          <View style={styles.relleno}>
            <Boton titulo="Nueva actividad" onPress={() => navigation.navigate('ActividadForm')} estilo={{ marginTop: espacio.m }} />
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="Tu organización todavía no publicó actividades." />}
      renderItem={({ item, index }) => (
        <View style={styles.relleno}>
          <ActividadCard actividad={item} indice={index} mostrarEstado onPress={() => navigation.navigate('GestionActividad', { id: item.id })} />
        </View>
      )}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.l },
}));
