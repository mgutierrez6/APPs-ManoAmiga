import { useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import Hero from '../../components/Hero';
import { Aparecer, Cargando, Chip, MensajeError, Tarjeta, TextoSuave, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { auditoria } from '../../api/admin';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { fechaHora } from '../../utils/formato';

const FILTROS = [
  { valor: null, texto: 'Todo' },
  { valor: 'denegado', texto: 'Denegados' },
  { valor: 'fallo', texto: 'Fallidos' },
  { valor: 'ok', texto: 'Correctos' },
];

// Color del punto según el resultado (el texto de la acción dice qué pasó).
const COLOR_RESULTADO = { ok: 'menta', fallo: 'sol', denegado: 'coral' };

/**
 * RS9 · Auditoría: permite detectar el uso indebido de credenciales (muchos "denegado" o "fallo"
 * seguidos, reauth fallidas, refresh tokens reutilizados...). Solo lectura.
 */
export default function AdminAuditoriaScreen() {
  const [resultado, setResultado] = useState(null);
  const { datos, cargando, error, recargar } = useCarga(() => auditoria({ resultado: resultado || undefined, limit: 50 }), [resultado]);

  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={datos?.data || []}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <>
          <Hero titulo="Auditoría" subtitulo="Últimos eventos de seguridad" tema="coral" figuras={1} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
            {FILTROS.map((f) => (
              <Chip key={f.texto} texto={f.texto} clave={f.texto} activo={resultado === f.valor} onPress={() => setResultado(f.valor)} />
            ))}
          </ScrollView>
          <View style={styles.relleno}>
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No hay eventos con ese filtro." />}
      renderItem={({ item, index }) => (
        <Aparecer indice={index} estilo={styles.relleno}>
          <Tarjeta acento={item.resultado === 'ok' ? colores.menta : item.resultado === 'fallo' ? colores.sol : colores.coral}>
            <View style={styles.fila}>
              <View style={[styles.punto, { backgroundColor: colores[COLOR_RESULTADO[item.resultado] || 'gris'] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.accion}>{item.accion.replace(/_/g, ' ')}</Text>
                <TextoSuave>{fechaHora(item.fecha)}</TextoSuave>
              </View>
            </View>
            <TextoSuave numberOfLines={1}>{item.usuario ? item.usuario.email : 'Sin usuario (anónimo)'}</TextoSuave>
            {item.recurso ? (
              <TextoSuave numberOfLines={1}>
                {item.recurso}
                {item.recursoId ? ` · ${item.recursoId}` : ''}
              </TextoSuave>
            ) : null}
            {item.detalle ? <TextoSuave numberOfLines={2}>{item.detalle}</TextoSuave> : null}
            {item.ip ? <TextoSuave>{item.ip}</TextoSuave> : null}
          </Tarjeta>
        </Aparecer>
      )}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.l },
  filtros: { paddingHorizontal: espacio.l, paddingTop: espacio.m },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginBottom: 4 },
  punto: { width: 12, height: 12, borderRadius: 6 },
  accion: { fontFamily: fuentes.tituloMedio, fontSize: 16, color: colores.tinta, textTransform: 'capitalize' },
}));
