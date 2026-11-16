import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Hero from '../../components/Hero';
import Icono from '../../components/Icono';
import { Aparecer, Cargando, EstadoBadge, MensajeError, Segmentos, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { cancelarInscripcion, descargarCertificado, misInscripciones } from '../../api/inscripciones';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { diaMes, fechaLarga, hora, rangoFechas } from '../../utils/formato';

const vigente = (i) => ['pendiente', 'aceptada'].includes(i.estado) && i.actividad?.fechaFin && new Date(i.actividad.fechaFin).getTime() > Date.now();
// Marcar asistencia: desde 1 h antes del inicio hasta 2 h después del fin (igual que en la API).
const MARGEN_QR = 2 * 3600000;
const enHorarioQR = (a) => Date.now() >= new Date(a.fechaInicio).getTime() - 3600000 && Date.now() <= new Date(a.fechaFin).getTime() + MARGEN_QR;

export default function MisInscripcionesScreen({ navigation }) {
  const { datos, cargando, error, recargar } = useCarga(() => misInscripciones({ limit: 50 }), []);
  const [ocupado, setOcupado] = useState(null);
  const [vista, setVista] = useState('proximas');

  const cancelar = (ins) => {
    Alert.alert('Cancelar inscripción', `¿Seguro que querés cancelar tu inscripción a "${ins.actividad.titulo}"?`, [
      { text: 'No' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setOcupado(ins.id);
          try {
            await cancelarInscripcion(ins.id);
            recargar();
          } catch (e) {
            Alert.alert('No se pudo cancelar', mensajeDeError(e));
          } finally {
            setOcupado(null);
          }
        },
      },
    ]);
  };

  const certificado = async (ins) => {
    setOcupado(ins.id);
    try {
      const bytes = await descargarCertificado(ins.id);
      const archivo = new File(Paths.cache, `certificado-${ins.id}.pdf`);
      archivo.create({ overwrite: true });
      archivo.write(new Uint8Array(bytes));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(archivo.uri, { mimeType: 'application/pdf', dialogTitle: 'Certificado de participación' });
      } else {
        Alert.alert('Certificado descargado', archivo.uri);
      }
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        status === 409
          ? 'Todavía no hay una asistencia validada para esta actividad.'
          : status === 403
            ? 'No tenés permiso para descargar este certificado.'
            : mensajeDeError(e);
      Alert.alert('Certificado', msg);
    } finally {
      setOcupado(null);
    }
  };

  const todas = datos?.data || [];
  const proximas = todas.filter(vigente).sort((a, b) => new Date(a.actividad.fechaInicio) - new Date(b.actividad.fechaInicio));
  const pasadas = todas.filter((i) => !vigente(i));
  const lista = vista === 'proximas' ? proximas : pasadas;

  const verActividad = (ins) => navigation.navigate('ActividadDetalle', { id: ins.actividadId });

  return (
    <FlatList
      style={styles.contenedor}
      data={lista}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={
        <>
          <Hero titulo={'Mis\ninscripciones'} />
          <View style={styles.relleno}>
            <Segmentos
              opciones={[
                { valor: 'proximas', texto: `Próximas · ${proximas.length}` },
                { valor: 'pasadas', texto: `Pasadas · ${pasadas.length}` },
              ]}
              valor={vista}
              onChange={setVista}
              estilo={{ marginBottom: espacio.l }}
            />
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      ListEmptyComponent={
        cargando ? (
          <Cargando />
        ) : (
          <Vacio texto={vista === 'proximas' ? 'No tenés actividades por delante. ¡Buscá una en Actividades!' : 'Acá van a quedar las actividades que ya pasaron.'} />
        )
      }
      renderItem={({ item: ins, index }) => {
        const { dia, mes } = diaMes(ins.actividad.fechaInicio);
        const t = estiloTipo(ins.actividad.tipo);
        const destacada = vista === 'proximas' && index === 0;
        if (destacada) {
          return (
            <Aparecer estilo={styles.relleno}>
              <Pressable accessibilityRole="button" onPress={() => verActividad(ins)} style={[styles.destacada, { backgroundColor: t.color }]}>
                <View style={[styles.burbuja, { backgroundColor: t.clarito }]} />
                <View style={styles.fila}>
                  <Fecha dia={dia} mes={mes} color={t.texto} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.titulo, { color: t.texto }]} numberOfLines={2}>
                      {ins.actividad.titulo}
                    </Text>
                    <Text style={[styles.linea, { color: t.texto }]}>{rangoFechas(ins.actividad.fechaInicio, ins.actividad.fechaFin)}</Text>
                  </View>
                  <View style={styles.estadoBlanco}>
                    <Text style={styles.estadoBlancoTexto}>{ins.estado === 'aceptada' ? 'Confirmada' : 'Pendiente'}</Text>
                  </View>
                </View>
                {ins.asistencia ? (
                  <EstadoAsistencia asistencia={ins.asistencia} color={t.texto} />
                ) : ins.estado === 'aceptada' && !enHorarioQR(ins.actividad) ? (
                  <Text style={[styles.nota, { color: t.texto }]}>
                    Te esperamos el {fechaLarga(ins.actividad.fechaInicio)} a las {hora(ins.actividad.fechaInicio)}. Ese día marcás tu asistencia acá.
                  </Text>
                ) : ins.estado === 'aceptada' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('EscanearQR', { actividadId: ins.actividadId, titulo: ins.actividad.titulo })}
                    style={styles.botonQR}
                  >
                    <Icono nombre="qr" color="#FFFFFF" tamano={18} />
                    <Text style={styles.botonQRTexto}>Escanear QR de asistencia</Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.nota, { color: t.texto }]}>Esperando que la organización confirme tu lugar.</Text>
                )}
                {ins.asistencia ? null : (
                  <Pressable accessibilityRole="button" onPress={() => cancelar(ins)} disabled={ocupado === ins.id} style={styles.cancelar}>
                    <Text style={[styles.cancelarTexto, { color: t.texto }]}>Cancelar inscripción</Text>
                  </Pressable>
                )}
              </Pressable>
            </Aparecer>
          );
        }
        return (
          <Aparecer indice={index} estilo={styles.relleno}>
            <Pressable accessibilityRole="button" onPress={() => verActividad(ins)} style={styles.tarjeta}>
              <View style={styles.fila}>
                <View style={[styles.fechaCaja, { backgroundColor: t.color }]}>
                  <Fecha dia={dia} mes={mes} color={t.texto} chica />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tituloFila} numberOfLines={2}>
                    {ins.actividad.titulo}
                  </Text>
                  <Text style={styles.lineaFila}>{rangoFechas(ins.actividad.fechaInicio, ins.actividad.fechaFin)}</Text>
                </View>
                <EstadoBadge estado={ins.estado} />
              </View>
              {vista === 'proximas' && ins.asistencia ? <EstadoAsistencia asistencia={ins.asistencia} /> : null}
              {vista === 'proximas' && ins.estado === 'aceptada' && !ins.asistencia && enHorarioQR(ins.actividad) ? (
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('EscanearQR', { actividadId: ins.actividadId, titulo: ins.actividad.titulo })} style={styles.accion}>
                  <Text style={styles.accionTexto}>Marcar asistencia</Text>
                </Pressable>
              ) : null}
              {vista === 'proximas' && !ins.asistencia ? (
                <Pressable accessibilityRole="button" onPress={() => cancelar(ins)} disabled={ocupado === ins.id} style={styles.accion}>
                  <Text style={styles.accionSuave}>Cancelar inscripción</Text>
                </Pressable>
              ) : null}
              {vista === 'pasadas' && ins.estado === 'aceptada' ? (
                <Pressable accessibilityRole="button" onPress={() => certificado(ins)} disabled={ocupado === ins.id} style={styles.accion}>
                  <Text style={styles.accionTexto}>{ocupado === ins.id ? 'Descargando…' : 'Mi certificado (PDF)'}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          </Aparecer>
        );
      }}
    />
  );
}

/** En vez de volver a ofrecer el QR: "ya marcaste tu asistencia" o "asistencia validada". */
function EstadoAsistencia({ asistencia, color }) {
  const validada = asistencia === 'validada';
  const c = color || colores.tinta;
  return (
    <View style={styles.asistencia}>
      <Icono nombre={validada ? 'check' : 'reloj'} color={c} tamano={16} grosor={2.2} />
      <Text style={[styles.asistenciaTexto, { color: c }]}>
        <Text style={styles.asistenciaTitulo}>{validada ? 'Asistencia validada' : 'Ya marcaste tu asistencia'}</Text>
        {validada ? ' · ¡Gracias por sumarte!' : ' · esperando validación'}
      </Text>
    </View>
  );
}

function Fecha({ dia, mes, color, chica = false }) {
  return (
    <View style={{ width: chica ? undefined : 50, alignItems: 'center' }}>
      <Text style={[styles.dia, chica && { fontSize: 19, lineHeight: 21 }, { color }]}>{dia}</Text>
      <Text style={[styles.mes, { color }]}>{mes}</Text>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.xl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dia: { fontFamily: fuentes.numero, fontSize: 30, lineHeight: 32 },
  mes: { fontFamily: fuentes.negrita, fontSize: 11 },

  destacada: { borderRadius: 24, padding: 16, marginBottom: 12, overflow: 'hidden', gap: 14 },
  burbuja: { position: 'absolute', width: 140, height: 140, borderRadius: 70, right: -40, top: -60 },
  titulo: { fontFamily: fuentes.negrita, fontSize: 15.5 },
  linea: { fontFamily: fuentes.texto, fontSize: 13, marginTop: 2 },
  estadoBlanco: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  estadoBlancoTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.tintaFija },
  botonQR: { flexDirection: 'row', gap: 8, height: 48, borderRadius: 999, backgroundColor: colores.tintaFija, alignItems: 'center', justifyContent: 'center' },
  botonQRTexto: { fontFamily: fuentes.negrita, fontSize: 14, color: '#FFFFFF' },
  nota: { fontFamily: fuentes.textoMedio, fontSize: 13 },
  cancelar: { alignSelf: 'center', paddingVertical: 4 },
  cancelarTexto: { fontFamily: fuentes.semi, fontSize: 13, textDecorationLine: 'underline' },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 22, padding: 14, marginBottom: 12 },
  fechaCaja: { width: 52, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tituloFila: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  lineaFila: { fontFamily: fuentes.texto, fontSize: 13, color: colores.tintaSuave, marginTop: 2 },
  asistencia: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  asistenciaTitulo: { fontFamily: fuentes.negrita },
  asistenciaTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: 13.5 },
  accion: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colores.linea },
  accionTexto: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.coral },
  accionSuave: { fontFamily: fuentes.semi, fontSize: 13.5, color: colores.tintaSuave },
}));
