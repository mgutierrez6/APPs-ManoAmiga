import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aparecer, Avatar, Boton, Cargando, EstadoBadge, MensajeError, Subtitulo, Tarjeta, TextoSuave } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { cancelarActividad, obtenerActividad } from '../../api/actividades';
import { cambiarEstadoInscripcion, inscriptosDeActividad } from '../../api/inscripciones';
import { asistenciaManual, asistenciasDeActividad, validarAsistencia } from '../../api/asistencias';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, familiaPara, fuentes } from '../../constants/tema';
import { fechaHora, rangoFechas } from '../../utils/formato';

/**
 * Gestión de participantes, asistencia y certificación (R4) de UNA actividad de la organización.
 * Si la actividad fuera de otra organización, la API responde 403 (RS3).
 */
export default function GestionActividadScreen({ route, navigation }) {
  const { id } = route.params;
  const [ocupado, setOcupado] = useState(null);

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
  const f = familiaPara(act.id);
  const cuenta = (estado) => inscriptos.filter((i) => i.estado === estado).length;

  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={colores.coral} />}
    >
      <View style={[styles.portada, { backgroundColor: f.base }]}>
        <EstadoBadge estado={act.estado} />
        <Text style={[styles.titulo, { color: f.texto }]}>{act.titulo}</Text>
        <Text style={[styles.subtitulo, { color: f.texto }]}>{rangoFechas(act.fechaInicio, act.fechaFin)}</Text>
      </View>

      {/* Contadores */}
      <View style={styles.contadores}>
        <Contador numero={cuenta('pendiente')} texto="pendientes" color={colores.solSuave} />
        <Contador numero={cuenta('aceptada')} texto="aceptados" color={colores.mentaSuave} />
        <Contador numero={asistencias.filter((a) => a.estado === 'validada').length} texto="asistieron" color={colores.lilaSuave} />
      </View>

      {activa ? (
        <View style={styles.acciones}>
          <Boton titulo="Mostrar QR de asistencia" onPress={() => navigation.navigate('MostrarQR', { id, titulo: act.titulo })} />
          <View style={styles.fila}>
            <Boton titulo="Editar" variante="sol" chico estilo={styles.mitad} onPress={() => navigation.navigate('ActividadForm', { id })} />
            <Boton
              titulo="Comunidad"
             
              variante="secundario"
              chico
              estilo={styles.mitad}
              onPress={() => navigation.navigate('Feed', { proyectoId: id, titulo: act.titulo, organizacionId: act.organizacionId })}
            />
          </View>
        </View>
      ) : null}

      <Subtitulo>Inscriptos ({inscriptos.length})</Subtitulo>
      {inscriptos.length === 0 ? <TextoSuave>Todavía no hay inscriptos. ¡Compartí la actividad!</TextoSuave> : null}
      {inscriptos.map((ins, i) => {
        const asis = asistenciaDe(ins.id);
        return (
          <Aparecer key={ins.id} indice={i}>
            <Tarjeta>
              <View style={styles.persona}>
                <Avatar nombre={ins.voluntario.nombre} apellido={ins.voluntario.apellido} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>
                    {ins.voluntario.nombre} {ins.voluntario.apellido}
                  </Text>
                  {ins.voluntario.telefono ? <TextoSuave>{ins.voluntario.telefono}</TextoSuave> : null}
                  {ins.voluntario.esJudicial ? <TextoSuave>Programa judicial</TextoSuave> : null}
                </View>
                <EstadoBadge estado={ins.estado} />
              </View>
              {asis ? (
                <View style={styles.asistencia}>
                  <Text style={styles.asistenciaTexto}>
                    {asis.estado === 'validada' ? `Asistencia validada · ${asis.horas} h` : `Entró ${fechaHora(asis.checkIn)} · falta validar`}
                  </Text>
                </View>
              ) : null}

              {ins.estado === 'pendiente' ? (
                <View style={styles.fila}>
                  <Boton titulo="Aceptar" variante="exito" chico estilo={styles.mitad} onPress={() => accion(`ac-${ins.id}`, () => cambiarEstadoInscripcion(ins.id, 'aceptada'))} cargando={ocupado === `ac-${ins.id}`} />
                  <Boton titulo="Rechazar" variante="borde" chico estilo={styles.mitad} onPress={() => accion(`re-${ins.id}`, () => cambiarEstadoInscripcion(ins.id, 'rechazada'))} cargando={ocupado === `re-${ins.id}`} />
                </View>
              ) : null}
              {ins.estado === 'aceptada' && !asis ? (
                <Boton titulo="Registrar asistencia manual" variante="borde" chico onPress={() => manual(ins)} cargando={ocupado === `man-${ins.id}`} />
              ) : null}
              {asis && asis.estado === 'abierta' ? (
                <Boton titulo="Validar asistencia" variante="secundario" chico onPress={() => accion(`val-${asis.id}`, () => validarAsistencia(asis.id))} cargando={ocupado === `val-${asis.id}`} />
              ) : null}
            </Tarjeta>
          </Aparecer>
        );
      })}

      {activa ? <Boton titulo="Cancelar actividad" variante="peligro" chico onPress={confirmarCancelacion} cargando={ocupado === 'cancelar'} estilo={{ marginTop: espacio.l }} /> : null}
    </ScrollView>
  );
}

function Contador({ numero, texto, color }) {
  return (
    <View style={[styles.contador, { backgroundColor: color }]}>
      <Text style={styles.contadorNumero}>{numero}</Text>
      <Text style={styles.contadorTexto}>{texto}</Text>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  contenido: { padding: espacio.l, paddingBottom: espacio.xxl },
  portada: { borderRadius: 28, padding: espacio.l, overflow: 'hidden', marginBottom: espacio.m, minHeight: 150, justifyContent: 'flex-end' },
  titulo: { fontFamily: fuentes.titulo, fontSize: 26, lineHeight: 30, marginTop: espacio.s },
  subtitulo: { fontFamily: fuentes.textoMedio, marginTop: 4 },
  contadores: { flexDirection: 'row', gap: espacio.s, marginBottom: espacio.s },
  contador: { flex: 1, borderRadius: 18, paddingVertical: espacio.m, alignItems: 'center' },
  contadorNumero: { fontFamily: fuentes.titulo, fontSize: 26, color: colores.tinta },
  contadorTexto: { fontFamily: fuentes.textoMedio, fontSize: 12, color: colores.tintaSuave },
  acciones: { marginTop: espacio.xs },
  fila: { flexDirection: 'row', gap: espacio.s },
  mitad: { flex: 1 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginBottom: espacio.s },
  nombre: { fontFamily: fuentes.tituloMedio, fontSize: 16, color: colores.tinta },
  asistencia: { backgroundColor: colores.crema, borderRadius: 12, padding: 10, marginBottom: espacio.s },
  asistenciaTexto: { fontFamily: fuentes.textoMedio, color: colores.tinta },
}));
