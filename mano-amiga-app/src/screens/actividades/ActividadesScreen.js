import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import ActividadCard from '../../components/ActividadCard';
import Hero from '../../components/Hero';
import { Cargando, Chip, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarActividades, listarEtiquetas } from '../../api/actividades';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { saludo } from '../../utils/formato';

/**
 * Listado de actividades disponibles. Si el usuario es voluntario judicial, la API ya excluye
 * las actividades sensibles (ABAC): la app no filtra nada por su cuenta.
 */
export default function ActividadesScreen({ navigation }) {
  const { usuario } = useAuth();
  const [etiqueta, setEtiqueta] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [masError, setMasError] = useState(null);

  const etiquetas = useCarga(() => listarEtiquetas(), []);
  const { cargando, error, recargar } = useCarga(async () => {
    const r = await listarActividades({ etiqueta: etiqueta || undefined, page: 1, limit: 20 });
    setLista(r.data);
    setTotal(r.total);
    setPagina(1);
    return r;
  }, [etiqueta]);

  const cargarMas = useCallback(async () => {
    if (lista.length >= total) return;
    try {
      const r = await listarActividades({ etiqueta: etiqueta || undefined, page: pagina + 1, limit: 20 });
      setLista((l) => [...l, ...r.data]);
      setPagina(pagina + 1);
    } catch (e) {
      setMasError(mensajeDeError(e));
    }
  }, [lista.length, total, pagina, etiqueta]);

  const cabecera = (
    <>
      <Hero titulo={`${saludo()}, ${usuario.nombre}!`} subtitulo="¿Dónde querés dar una mano hoy?" tema="coral" figuras={0} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros} contentContainerStyle={styles.filtrosContenido}>
        <Chip texto="Todas" clave="todas" activo={!etiqueta} onPress={() => setEtiqueta(null)} />
        {(etiquetas.datos || []).map((e) => (
          <Chip key={e.id} texto={e.nombre} clave={e.nombre} activo={etiqueta === e.id} onPress={() => setEtiqueta(e.id)} />
        ))}
      </ScrollView>
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Próximas actividades</Text>
        {total ? <Text style={styles.contador}>{total}</Text> : null}
      </View>
      <View style={styles.relleno}>
        <MensajeError texto={error || masError} onReintentar={recargar} />
      </View>
    </>
  );

  return (
    <FlatList
      style={styles.contenedor}
      data={lista}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={cabecera}
      contentContainerStyle={styles.lista}
      renderItem={({ item, index }) => (
        <View style={styles.relleno}>
          <ActividadCard actividad={item} indice={index} onPress={() => navigation.navigate('ActividadDetalle', { id: item.id })} />
        </View>
      )}
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No hay actividades con ese filtro por ahora. ¡Probá con otra etiqueta!" />}
      refreshControl={<RefreshControl refreshing={cargando && lista.length > 0} onRefresh={recargar} tintColor={colores.coral} />}
      onEndReached={cargarMas}
      onEndReachedThreshold={0.4}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  filtros: { flexGrow: 0, marginTop: espacio.m },
  filtrosContenido: { paddingHorizontal: espacio.l, paddingTop: 2 },
  seccion: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: espacio.l, marginTop: espacio.s, marginBottom: espacio.m },
  seccionTitulo: { fontFamily: fuentes.titulo, fontSize: 20, color: colores.tinta },
  contador: {
    fontFamily: fuentes.negrita,
    marginLeft: 8,
    backgroundColor: colores.sol,
    color: colores.tintaFija,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 13,
  },
  relleno: { paddingHorizontal: espacio.l },
}));
