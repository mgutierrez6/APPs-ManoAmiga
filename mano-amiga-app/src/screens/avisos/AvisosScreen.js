import { useLayoutEffect } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Icono from '../../components/Icono';
import { Cargando, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { leerTodos, marcarLeido, misAvisos } from '../../api/avisos';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { haceCuanto } from '../../utils/formato';

// Ícono y color de fondo de cada tipo de aviso (el ícono va siempre en azul oscuro).
const ESTILO = {
  inscripcion_aceptada: { icono: 'check', fondo: () => colores.menta },
  inscripcion_rechazada: { icono: 'cerrar', fondo: () => colores.lila },
  actividad_cancelada: { icono: 'cerrar', fondo: () => colores.durazno },
  actividad_cambiada: { icono: 'calendario', fondo: () => colores.sol },
  novedad: { icono: 'novedades', fondo: () => colores.limon },
  chat: { icono: 'chat', fondo: () => colores.lila },
};

/** Lista de avisos de la campanita. Tocar uno lo marca como leído y lleva a su pantalla. */
export default function AvisosScreen({ navigation }) {
  const { usuario } = useAuth();
  const { datos, setDatos, cargando, error, recargar } = useCarga(() => misAvisos(), []);
  const lista = datos?.data || [];
  const sinLeer = lista.filter((n) => !n.leida).length;

  const leerTodo = async () => {
    setDatos((d) => d && { ...d, data: d.data.map((n) => ({ ...n, leida: true })), sinLeer: 0 });
    try {
      await leerTodos();
    } catch {
      recargar();
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        sinLeer ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={leerTodo}>
            <Text style={styles.leerTodo}>Marcar todo leído</Text>
          </Pressable>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, sinLeer]);

  const abrir = (n) => {
    if (!n.leida) {
      setDatos((d) => d && { ...d, data: d.data.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) });
      marcarLeido(n.id).catch(() => {});
    }
    if (!n.actividadId) return;
    if (n.tipo === 'chat') return navigation.navigate('Chat', { id: n.actividadId, titulo: n.titulo });
    if (n.tipo === 'novedad') return navigation.navigate('Feed', { proyectoId: n.actividadId, titulo: n.titulo });
    if (n.tipo === 'actividad_cancelada') return; // la actividad ya no se muestra
    if (usuario.rol === 'voluntario') navigation.navigate('ActividadDetalle', { id: n.actividadId });
  };

  if (cargando && !datos) return <Cargando />;

  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={lista}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={<MensajeError texto={error} onReintentar={recargar} />}
      ListEmptyComponent={!error ? <Vacio titulo="Sin avisos" texto="Acá te vamos a avisar cuando te acepten, haya novedades o mensajes nuevos." /> : null}
      ItemSeparatorComponent={() => <View style={styles.separador} />}
      renderItem={({ item: n }) => {
        const e = ESTILO[n.tipo] || ESTILO.novedad;
        return (
          <Pressable accessibilityRole="button" onPress={() => abrir(n)} style={({ pressed }) => [styles.fila, pressed && { opacity: 0.7 }]}>
            <View style={[styles.icono, { backgroundColor: e.fondo() }]}>
              <Icono nombre={e.icono} color={colores.tintaFija} tamano={18} grosor={2.1} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.titulo, !n.leida && styles.tituloNuevo]} numberOfLines={1}>
                {n.titulo}
              </Text>
              <Text style={styles.texto}>{n.texto}</Text>
              <Text style={styles.cuando}>{haceCuanto(n.fecha)}</Text>
            </View>
            {!n.leida ? <View style={styles.punto} accessibilityLabel="Sin leer" /> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { padding: espacio.l, paddingBottom: espacio.xxl, flexGrow: 1 },
  leerTodo: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.coralTexto },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  separador: { height: 1, backgroundColor: colores.linea },
  icono: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fuentes.semi, fontSize: 15, color: colores.tinta },
  tituloNuevo: { fontFamily: fuentes.negrita },
  texto: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.tintaSuave, marginTop: 2 },
  cuando: { fontFamily: fuentes.texto, fontSize: 12, color: colores.gris, marginTop: 4 },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colores.coral, marginTop: 6 },
}));
