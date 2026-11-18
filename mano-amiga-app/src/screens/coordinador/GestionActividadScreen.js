import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Icono from '../../components/Icono';
import { Aparecer, Avatar, Cargando, EstadoBadge, MensajeError } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { cancelarActividad, obtenerActividad } from '../../api/actividades';
import { cambiarEstadoInscripcion, inscriptosDeActividad } from '../../api/inscripciones';
import { asistenciaManual, asistenciasDeActividad, validarAsistencia } from '../../api/asistencias';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes, tituloGrande } from '../../constants/tema';
import { estiloTipo, tipoDe } from '../../constants/tipos';
import { rangoFechas } from '../../utils/formato';

/** Un color con transparencia (ej.: transparente('#407ADD', 0.25)). */
const transparente = (hex, alfa) => `${hex}${Math.round(alfa * 255).toString(16).padStart(2, '0')}`;

/**
 * Gestión de participantes, asistencia y certificación (R4) de UNA actividad de la organización.
 * Si la actividad fuera de otra organización, la API responde 403 (RS3).
 * Diseño liviano: contadores "tipo seguidores", botones en tonos transparentes y una card por inscripto.
 */
export default function GestionActividadScreen({ route, navigation }) {
  const { id } = route.params;
  const [ocupado, setOcupado] = useState(null);
  const insets = useSafeAreaInsets();

  const { datos, cargando, error, recargar } = useCarga(async () => {
    const [actividad, inscriptos, asistencias] = await Promise.all([obtenerActividad(id), inscriptosDeActividad(id), asistenciasDeActividad(id)]);
    return { actividad, inscriptos, asistencias };
  }, [id]);

  const accion = useCallback(
    async (clave, fn) => {
      setOcupado(clave);
      try {
        await fn();
        await recargar();
      } catch (e) {
        Alert.alert('No se pudo completar', mensajeDeError(e));
      } finally {
        setOcupado(null);
      }
    },
    [recargar]
  );

  const confirmarCancelacion = () =>
    Alert.alert('Cancelar actividad', 'La actividad deja de mostrarse a los voluntarios. ¿Seguís?', [
      { text: 'No' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => accion('cancelar', () => cancelarActividad(id)) },
    ]);

  const manual = (ins) =>
    Alert.alert('Asistencia manual', `¿Registrar la asistencia de ${ins.voluntario.nombre} por la duración completa de la actividad?`, [
      { text: 'No' },
      { text: 'Registrar', onPress: () => accion(`man-${ins.id}`, () => asistenciaManual(ins.id)) },
    ]);

  if (cargando && !datos) return <Cargando />;
  if (error && !datos) return <MensajeError texto={error} onReintentar={recargar} />;
  if (!datos) return null;

  const { actividad: act, inscriptos, asistencias } = datos;
  const asistenciaDe = (insId) => asistencias.find((a) => a.inscripcionId === insId);
  const activa = act.estado === 'publicada';
  // RS-20: no se acreditan horas de una actividad que todavía no empezó (la API lo rechaza).
  const empezo = Date.now() >= new Date(act.fechaInicio).getTime();
  const t = estiloTipo(act.tipo);
  const cuenta = (estado) => inscriptos.filter((i) => i.estado === estado).length;
  const lugares = act.cupoIlimitado ? 'cupos ilimitados' : `${act.inscriptos}/${act.cupo} lugares ocupados`;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido} refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={colores.coral} />}>
      {/* Banda de color del tipo (en clarito, con circulitos de fondo), como la portada de las organizaciones */}
      <View style={[styles.banda, { paddingTop: insets.top + espacio.s, backgroundColor: t.clarito }]}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 390 200" preserveAspectRatio="xMidYMid slice">
          <Circle cx="330" cy="40" r="46" fill={t.color} fillOpacity={0.35} />
          <Circle cx="372" cy="128" r="22" fill={t.color} fillOpacity={0.25} />
          <Circle cx="52" cy="170" r="34" fill={t.color} fillOpacity={0.22} />
          <Circle cx="250" cy="150" r="10" fill="#FFFFFF" fillOpacity={0.55} />
          <Circle cx="120" cy="64" r="7" fill="#FFFFFF" fillOpacity={0.55} />
        </Svg>
        <View style={styles.bandaFila}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={styles.botonVidrio} hitSlop={6}>
            <Icono nombre="izquierda" color={colores.tintaFija} tamano={20} />
          </Pressable>
          <Text style={styles.bandaTitulo}>Gestionar actividad</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.cabeceraFila}>
          <EstadoBadge estado={act.estado} />
          {act.tipo ? (
            <View style={[styles.tipo, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
              <Icono nombre={t.icono} color={colores.tintaFija} tamano={13} grosor={2.2} />
              <Text style={styles.tipoTexto}>{act.tipo}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.titulo}>{act.titulo}</Text>
      </View>

      <View style={styles.cuerpo}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>
          {rangoFechas(act.fechaInicio, act.fechaFin)} · {lugares}
        </Text>
      </View>

      {/* Contadores tipo "seguidores" */}
      <View style={styles.contadores}>
        <Contador numero={cuenta('pendiente')} texto="pendientes" />
        <View style={styles.separador} />
        <Contador numero={cuenta('aceptada')} texto="aceptados" />
        <View style={styles.separador} />
        <Contador numero={asistencias.filter((a) => a.estado === 'validada').length} texto="asistieron" />
      </View>

      {activa ? (
        <>
          <View style={styles.enlaces}>
            <Enlace icono="lapiz" texto="Editar" onPress={() => navigation.navigate('ActividadForm', { id })} />
            {/* Novedades: públicas (las lee cualquiera, aunque no esté anotado); solo publica el coordinador. */}
            <Enlace icono="novedades" texto="Novedades" onPress={() => navigation.navigate('Feed', { proyectoId: id, titulo: act.titulo, organizacionId: act.organizacionId })} />
            {/* Chat de la actividad: solo inscriptos aceptados + coordinadores (lo controla la API). */}
            <Enlace icono="chat" texto="Chat" onPress={() => navigation.navigate('Chat', { id, titulo: act.titulo, tipo: tipoDe(act) })} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('MostrarQR', { id, titulo: act.titulo })}
            style={({ pressed }) => [styles.botonQR, { backgroundColor: transparente(t.color, 0.35) }, pressed && { opacity: 0.75 }]}
          >
            <Icono nombre="qr" color={colores.tinta} tamano={17} />
            <Text style={styles.botonQRTexto}>Mostrar QR de asistencia</Text>
          </Pressable>
        </>
      ) : null}

      <Text style={styles.seccion}>Inscriptos ({inscriptos.length})</Text>
      {inscriptos.length === 0 ? <Text style={styles.vacio}>Todavía no hay inscriptos. ¡Compartí la actividad!</Text> : null}
      {inscriptos.map((ins, i) => {
        const asis = asistenciaDe(ins.id);
        return (
          <Aparecer key={ins.id} indice={i}>
            <View style={styles.persona}>
              <Avatar nombre={ins.voluntario.nombre} apellido={ins.voluntario.apellido} tamano={42} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {ins.voluntario.nombre} {ins.voluntario.apellido}
                </Text>
                {ins.voluntario.esJudicial ? <Text style={styles.detalle}>Programa judicial</Text> : null}
                {ins.voluntario.telefono ? <Text style={styles.detalle}>{ins.voluntario.telefono}</Text> : null}
                {asis && asis.estado === 'validada' && ins.voluntario.esJudicial ? <Text style={styles.detalle}>{asis.horas} h acreditadas</Text> : null}
                {ins.estado === 'aceptada' && !asis && !empezo ? <Text style={styles.detalle}>Asistencia manual: cuando empiece la actividad</Text> : null}
                {ins.estado === 'aceptada' && !asis && empezo ? (
                  <Pressable accessibilityRole="button" onPress={() => manual(ins)} disabled={ocupado === `man-${ins.id}`} hitSlop={6}>
                    <Text style={styles.enlaceChico}>{ocupado === `man-${ins.id}` ? 'Registrando…' : 'Registrar asistencia manual'}</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Acciones chicas a la derecha, una abajo de la otra */}
              {ins.estado === 'pendiente' ? (
                <View style={styles.acciones}>
                  <AccionChica texto="Aceptar" fondo={transparente(colores.menta, 0.45)} cargando={ocupado === `ac-${ins.id}`} onPress={() => accion(`ac-${ins.id}`, () => cambiarEstadoInscripcion(ins.id, 'aceptada'))} />
                  <AccionChica texto="Rechazar" borde cargando={ocupado === `re-${ins.id}`} onPress={() => accion(`re-${ins.id}`, () => cambiarEstadoInscripcion(ins.id, 'rechazada'))} />
                </View>
              ) : null}
              {asis && asis.estado === 'abierta' ? (
                <View style={styles.acciones}>
                  <AccionChica texto="Validar" fondo={transparente(colores.oceano, 0.22)} cargando={ocupado === `val-${asis.id}`} onPress={() => accion(`val-${asis.id}`, () => validarAsistencia(asis.id))} />
                </View>
              ) : null}
              {/* Sin acción pendiente: el estado queda a la derecha */}
              {ins.estado !== 'pendiente' && !(asis && asis.estado === 'abierta') ? <EstadoBadge estado={asis ? 'validada' : ins.estado} /> : null}
            </View>
          </Aparecer>
        );
      })}

      {activa ? (
        <Pressable accessibilityRole="button" onPress={confirmarCancelacion} disabled={ocupado === 'cancelar'} style={({ pressed }) => [styles.cancelar, pressed && { opacity: 0.7 }]}>
          <Text style={styles.cancelarTexto}>{ocupado === 'cancelar' ? 'Cancelando…' : 'Cancelar actividad'}</Text>
        </Pressable>
      ) : null}
      </View>
    </ScrollView>
  );
}

function Contador({ numero, texto }) {
  return (
    <View style={styles.contador}>
      <Text style={styles.contadorNumero}>{numero}</Text>
      <Text style={styles.contadorTexto}>{texto}</Text>
    </View>
  );
}

function Enlace({ icono, texto, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.enlace, pressed && { opacity: 0.6 }]} hitSlop={6}>
      <Icono nombre={icono} color={colores.tinta} tamano={18} />
      <Text style={styles.enlaceTexto}>{texto}</Text>
    </Pressable>
  );
}

function AccionChica({ texto, onPress, fondo, borde = false, cargando = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={cargando}
      style={({ pressed }) => [styles.accionChica, fondo && { backgroundColor: fondo }, borde && styles.accionBorde, pressed && { opacity: 0.7 }]}
    >
      {cargando ? <ActivityIndicator size="small" color={colores.tinta} /> : <Text style={styles.accionTexto}>{texto}</Text>}
    </Pressable>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  contenido: { paddingBottom: espacio.xxl },
  cuerpo: { paddingHorizontal: espacio.xl },

  banda: { paddingHorizontal: espacio.xl, paddingBottom: espacio.l, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  bandaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espacio.xl },
  bandaTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 17, color: colores.tintaFija },
  botonVidrio: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },

  cabecera: { marginTop: espacio.m, marginBottom: espacio.m },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  tipoTexto: { fontFamily: fuentes.negrita, fontSize: 11.5, color: colores.tintaFija },
  titulo: { ...tituloGrande(34), color: colores.tintaFija, marginTop: espacio.m },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 13.5, color: colores.tintaSuave },

  contadores: { flexDirection: 'row', alignItems: 'center', paddingVertical: espacio.s, marginBottom: espacio.l },
  contador: { flex: 1, alignItems: 'center' },
  contadorNumero: { fontFamily: fuentes.numero, fontSize: 24, color: colores.tinta },
  contadorTexto: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaSuave },
  separador: { width: 1, height: 28, backgroundColor: colores.borde },

  botonQR: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 16 },
  botonQRTexto: { fontFamily: fuentes.negrita, fontSize: 14.5, color: colores.tinta },
  enlaces: { flexDirection: 'row', justifyContent: 'center', gap: 26, marginBottom: espacio.s },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  enlaceTexto: { fontFamily: fuentes.semi, fontSize: 14.5, color: colores.tinta },

  seccion: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta, marginTop: espacio.xl, marginBottom: espacio.m },
  vacio: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave },
  persona: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 20, padding: 12, marginBottom: 10 },
  nombre: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  detalle: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaSuave },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  enlaceChico: { fontFamily: fuentes.semi, fontSize: 12.5, color: colores.coral, marginTop: 6 },
  acciones: { gap: 6 },
  accionChica: { minWidth: 82, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  accionBorde: { borderWidth: 1.5, borderColor: colores.borde },
  accionTexto: { fontFamily: fuentes.negrita, fontSize: 12.5, color: colores.tinta },

  cancelar: { alignSelf: 'center', marginTop: espacio.xl, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: transparente('#D62246', 0.08) },
  cancelarTexto: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.coralTexto },
}));
