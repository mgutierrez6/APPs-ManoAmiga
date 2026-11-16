import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActividadCard from '../../components/ActividadCard';
import Icono from '../../components/Icono';
import { LogoMarca } from '../../components/Logo';
import { Avatar, Cargando, Chip, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarActividades, listarEtiquetas } from '../../api/actividades';
import { misInscripciones } from '../../api/inscripciones';
import { listarCampanas } from '../../api/comunidad';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes, tituloGrande } from '../../constants/tema';
import { diaMes, fechaHora, hora } from '../../utils/formato';
import { estiloTipo, etiquetaEsTipo } from '../../constants/tipos';

/** La próxima actividad (que todavía no terminó) en la que la persona está inscripta o aceptada. */
function proximaInscripcion(inscripciones) {
  const ahora = Date.now();
  return (inscripciones || [])
    .filter((i) => ['pendiente', 'aceptada'].includes(i.estado) && i.actividad?.fechaFin && new Date(i.actividad.fechaFin).getTime() > ahora)
    .sort((a, b) => new Date(a.actividad.fechaInicio) - new Date(b.actividad.fechaInicio))[0];
}

/**
 * Inicio del voluntario: "Dá una mano · Sumate a una actividad". Si la persona es voluntaria judicial, la API ya excluye
 * las actividades sensibles (ABAC): la app no filtra nada por su cuenta.
 */
export default function ActividadesScreen({ navigation }) {
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const [etiqueta, setEtiqueta] = useState(null);
  // Si alguno de estos falla, simplemente no se muestra su bloque.
  const inscripciones = useCarga(() => misInscripciones({ limit: 50 }), []);
  const campanas = useCarga(() => listarCampanas({ limit: 50 }), []);
  const proxima = useMemo(() => proximaInscripcion(inscripciones.datos?.data), [inscripciones.datos]);
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [masError, setMasError] = useState(null);

  const etiquetas = useCarga(() => listarEtiquetas(), []);
  const tipos = (etiquetas.datos || []).filter(etiquetaEsTipo);
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

  const listaCampanas = campanas.datos?.data || [];

  const cabecera = (
    <>
      <View style={[styles.saludo, { paddingTop: insets.top + espacio.xl }]}>
        <View style={styles.saludoFila}>
          <Text style={styles.hola}>Hola, {usuario.nombre}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Ir a mi perfil" onPress={() => navigation.navigate('Perfil')}>
            <Avatar nombre={usuario.nombre} tamano={38} />
          </Pressable>
        </View>
        <Text style={styles.titulo}>¡Dá una mano!</Text>
        {/* Siempre en un solo renglón: si no entra, la letra se achica un poco sola. */}
        <Text style={styles.bajada} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          Sumate a una actividad, nos hace falta una <Text style={styles.bajadaFuerte}>mano amiga</Text>
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros} contentContainerStyle={styles.filtrosContenido}>
        <Chip texto="Todas" clave="todas" activo={!etiqueta} onPress={() => setEtiqueta(null)} />
        {tipos.map((e) => (
          <Chip key={e.id} texto={e.nombre} clave={e.nombre} activo={etiqueta === e.id} onPress={() => setEtiqueta(e.id)} />
        ))}
      </ScrollView>

      {proxima ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ActividadDetalle', { id: proxima.actividadId })}
          style={({ pressed }) => [styles.destacada, { backgroundColor: estiloTipo(proxima.actividad.tipo).color }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.destacadaNumero} aria-hidden>
            {diaMes(proxima.actividad.fechaInicio).dia}
          </Text>
          <View style={styles.destacadaEtiqueta}>
            <Text style={styles.destacadaEtiquetaTexto}>{proxima.estado === 'aceptada' ? 'Tu próxima actividad' : 'Esperando confirmación'}</Text>
          </View>
          <Text style={styles.destacadaTitulo} numberOfLines={2}>
            {proxima.actividad.titulo}
          </Text>
          <Text style={styles.destacadaCuando}>
            {fechaHora(proxima.actividad.fechaInicio)} a {hora(proxima.actividad.fechaFin)}
          </Text>
        </Pressable>
      ) : null}

      {listaCampanas.length ? (
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Campanas')} style={({ pressed }) => [styles.campanas, pressed && { opacity: 0.85 }]}>
          <View style={styles.campanasIcono}>
            <LogoMarca tamano={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.campanasTitulo}>Campañas de donación</Text>
          </View>
          <Icono nombre="derecha" color={colores.tinta} tamano={18} grosor={2.2} />
        </Pressable>
      ) : null}

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Próximas</Text>
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
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No hay actividades de ese tipo por ahora. ¡Probá con otro!" />}
      refreshControl={<RefreshControl refreshing={cargando && lista.length > 0} onRefresh={recargar} tintColor={colores.coral} />}
      onEndReached={cargarMas}
      onEndReachedThreshold={0.4}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  saludo: { paddingHorizontal: espacio.xl },
  saludoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hola: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave },
  titulo: { ...tituloGrande(52), color: colores.tinta, marginTop: espacio.s },
  bajada: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave, marginTop: 6 },
  bajadaFuerte: { fontFamily: fuentes.negrita, color: colores.tinta },

  filtros: { flexGrow: 0, marginTop: espacio.l },
  filtrosContenido: { paddingHorizontal: espacio.xl, paddingTop: 2 },

  destacada: { marginHorizontal: espacio.xl, marginTop: espacio.m, backgroundColor: colores.coral, borderRadius: 28, padding: 22, minHeight: 170, overflow: 'hidden', justifyContent: 'space-between' },
  destacadaNumero: { position: 'absolute', right: -14, top: -34, fontFamily: fuentes.numero, fontSize: 170, lineHeight: 190, color: '#FFFFFF', opacity: 0.35 },
  destacadaEtiqueta: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  destacadaEtiquetaTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.tintaFija },
  destacadaTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 24, lineHeight: 26, color: colores.tintaFija, marginTop: 40, letterSpacing: -0.5 },
  destacadaCuando: { fontFamily: fuentes.textoMedio, fontSize: 14, color: colores.tintaFija, marginTop: 6 },

  campanas: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginHorizontal: espacio.xl, marginTop: espacio.m, backgroundColor: colores.beige, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 },
  // Cuadradito de "vidrio" (blanco medio transparente), como los botones de Mi historia.
  campanasIcono: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  campanasTitulo: { fontFamily: fuentes.negrita, fontSize: 14.5, color: colores.tinta },
  campanasTexto: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaFija, marginTop: 1 },

  seccion: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: espacio.xl, marginTop: espacio.xl, marginBottom: 2 },
  seccionTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 20, color: colores.tinta, letterSpacing: -0.3 },
  contador: { fontFamily: fuentes.textoMedio, marginLeft: 8, color: colores.tintaSuave, fontSize: 13 },
  relleno: { paddingHorizontal: espacio.xl },
}));
