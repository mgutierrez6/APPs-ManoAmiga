import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Hero from '../../components/Hero';
import Campanita from '../../components/Campanita';
import { Aparecer, Boton, Cargando, EstadoBadge, MensajeError, Segmentos, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarActividades } from '../../api/actividades';
import { perfilOrganizacion } from '../../api/organizaciones';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { diaMes, fechaHora, hora } from '../../utils/formato';

const terminada = (a) => new Date(a.fechaFin).getTime() < Date.now();
const inscriptosTexto = (a) => (a.cupoIlimitado ? `${a.inscriptos} inscriptos` : `${a.inscriptos}/${a.cupo} inscriptos`);

/**
 * Pantalla principal del coordinador: las actividades de SU organización (la API la toma del token).
 * Arriba, en grande, la próxima actividad; abajo, la lista (Próximas / Pasadas).
 */
export default function MisActividadesScreen({ navigation }) {
  const { usuario } = useAuth();
  const [vista, setVista] = useState('proximas');
  const { datos, cargando, error, recargar } = useCarga(() => listarActividades({ mias: true, limit: 50 }), []);
  const org = useCarga(() => (usuario.organizacionId ? perfilOrganizacion(usuario.organizacionId) : Promise.resolve(null)), [usuario.organizacionId]);

  const todas = datos?.data || [];
  const proximas = todas.filter((a) => !terminada(a) && a.estado !== 'cancelada').sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
  const pasadas = todas.filter((a) => terminada(a) || a.estado === 'cancelada').sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
  const destacada = proximas[0];
  // La destacada no se repite en la lista de próximas.
  const lista = vista === 'proximas' ? proximas.slice(1) : pasadas;

  return (
    <FlatList
      style={styles.contenedor}
      data={lista}
      keyExtractor={(a) => a.id}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={
        <>
          <Hero antetitulo={org.datos?.nombre || `Hola, ${usuario.nombre}`} titulo={'Mis\nactividades'} derecha={<Campanita />} />
          <View style={styles.relleno}>
            <Boton titulo="Nueva actividad" icono="mas" onPress={() => navigation.navigate('ActividadForm')} />

            {destacada ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('GestionActividad', { id: destacada.id })}
                style={({ pressed }) => [styles.destacada, { backgroundColor: estiloTipo(destacada.tipo).color }, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.destacadaNumero} aria-hidden>
                  {diaMes(destacada.fechaInicio).dia}
                </Text>
                <View style={styles.destacadaEtiqueta}>
                  <Text style={styles.destacadaEtiquetaTexto}>Próxima actividad · {inscriptosTexto(destacada)}</Text>
                </View>
                <Text style={styles.destacadaTitulo} numberOfLines={2}>
                  {destacada.titulo}
                </Text>
                <Text style={styles.destacadaCuando}>
                  {fechaHora(destacada.fechaInicio)} a {hora(destacada.fechaFin)}
                </Text>
              </Pressable>
            ) : null}

            <Segmentos
              opciones={[
                { valor: 'proximas', texto: `Próximas · ${proximas.length}` },
                { valor: 'pasadas', texto: `Pasadas · ${pasadas.length}` },
              ]}
              valor={vista}
              onChange={setVista}
              estilo={{ marginTop: espacio.l, marginBottom: espacio.m }}
            />
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      ListEmptyComponent={
        cargando ? (
          <Cargando />
        ) : (
          <Vacio
            texto={
              vista === 'proximas'
                ? destacada
                  ? 'No hay más actividades por ahora.'
                  : 'No hay actividades próximas. ¡Creá una!'
                : 'Todavía no hay actividades pasadas.'
            }
          />
        )
      }
      renderItem={({ item: a, index }) => {
        const t = estiloTipo(a.tipo);
        const { dia, mes } = diaMes(a.fechaInicio);
        return (
          <Aparecer indice={index} estilo={styles.relleno}>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('GestionActividad', { id: a.id })} style={({ pressed }) => [styles.fila, pressed && { opacity: 0.8 }]}>
              <View style={[styles.fecha, { backgroundColor: t.color }]}>
                <Text style={[styles.dia, { color: t.texto }]}>{dia}</Text>
                <Text style={[styles.mes, { color: t.texto }]}>{mes}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo} numberOfLines={2}>
                  {a.titulo}
                </Text>
                <Text style={styles.linea}>
                  {hora(a.fechaInicio)} a {hora(a.fechaFin)} · {inscriptosTexto(a)}
                </Text>
              </View>
              {a.estado === 'cancelada' ? <EstadoBadge estado="cancelada" /> : null}
            </Pressable>
          </Aparecer>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.xl },

  destacada: { marginTop: espacio.m, backgroundColor: colores.coral, borderRadius: 28, padding: 22, minHeight: 170, overflow: 'hidden', justifyContent: 'space-between' },
  destacadaNumero: { position: 'absolute', right: -14, top: -34, fontFamily: fuentes.numero, fontSize: 170, lineHeight: 190, color: '#FFFFFF', opacity: 0.35 },
  destacadaEtiqueta: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  destacadaEtiquetaTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.tintaFija },
  destacadaTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 24, lineHeight: 26, color: colores.tintaFija, marginTop: 40, letterSpacing: -0.5 },
  destacadaCuando: { fontFamily: fuentes.textoMedio, fontSize: 14, color: colores.tintaFija, marginTop: 6 },

  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 20, padding: 12, marginBottom: 10 },
  fecha: { width: 50, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dia: { fontFamily: fuentes.numero, fontSize: 20, lineHeight: 22 },
  mes: { fontFamily: fuentes.negrita, fontSize: 10 },
  titulo: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  linea: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaSuave, marginTop: 2 },
}));
