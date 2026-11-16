import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono from '../../components/Icono';
import { Boton, Cargando, MensajeError } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { obtenerActividad } from '../../api/actividades';
import { inscribirme, misInscripciones } from '../../api/inscripciones';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes, tituloGrande } from '../../constants/tema';
import { estiloTipo, tipoDe } from '../../constants/tipos';
import { diaMes, fechaLarga, hora } from '../../utils/formato';
import { abrirComoLlegar } from '../mapa/comun';

/**
 * Detalle de una actividad. La organización se puede tocar para ver su perfil.
 * Las horas solo se muestran a voluntarios del programa judicial (a los demás no les suman nada).
 */
export default function ActividadDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const { datos: act, cargando, error, recargar } = useCarga(() => obtenerActividad(id), [id]);
  const [enviando, setEnviando] = useState(false);
  // Si la persona ya se anotó, en vez del botón se muestra en qué estado está su inscripción.
  const mias = useCarga(() => (usuario.rol === 'voluntario' ? misInscripciones({ limit: 50 }) : Promise.resolve(null)), [id]);
  const miInscripcion = (mias.datos?.data || []).find((i) => i.actividadId === id && ['pendiente', 'aceptada', 'rechazada'].includes(i.estado));

  const inscribir = async () => {
    setEnviando(true);
    try {
      await inscribirme(id);
      navigation.replace('InscripcionLista', { actividad: act });
    } catch (e) {
      Alert.alert('No se pudo inscribir', mensajeDeError(e));
      setEnviando(false);
    }
  };

  if (cargando && !act) return <Cargando />;
  if (error && !act) {
    return (
      <View style={[styles.contenedor, { paddingTop: insets.top + espacio.l, paddingHorizontal: espacio.l }]}>
        <MensajeError texto={error} onReintentar={recargar} />
      </View>
    );
  }
  if (!act) return null;

  const tipo = tipoDe(act);
  const t = estiloTipo(tipo);
  const horas = Math.round(((new Date(act.fechaFin) - new Date(act.fechaInicio)) / 3600000) * 10) / 10;
  const { dia, mes } = diaMes(act.fechaInicio);
  const ilimitado = act.cupoIlimitado || act.cupo == null;
  const sinLugar = !ilimitado && act.cuposLibres === 0;
  const esVoluntario = usuario.rol === 'voluntario';
  // Marcar asistencia: desde 1 h antes del inicio hasta 2 h después del fin (igual que en la API).
  const MARGEN_QR = 2 * 3600000;
  const ahora = Date.now();
  const enHorarioQR = ahora >= new Date(act.fechaInicio).getTime() - 3600000 && ahora <= new Date(act.fechaFin).getTime() + MARGEN_QR;
  const yaTermino = ahora > new Date(act.fechaFin).getTime() + MARGEN_QR;

  return (
    <View style={styles.contenedor}>
      <ScrollView contentContainerStyle={{ paddingBottom: esVoluntario ? 130 : espacio.xxl }}>
        <View style={[styles.portada, { backgroundColor: t.color, paddingTop: insets.top + espacio.m }]}>
          <Text style={[styles.fondoPalabra, { color: t.clarito }]} aria-hidden>
            {(tipo || 'sumate').toLowerCase()}
          </Text>
          <View style={styles.portadaFila}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={styles.atras}>
              <Icono nombre="izquierda" color={colores.tintaFija} tamano={20} />
            </Pressable>
            {tipo ? (
              <View style={styles.tipo}>
                <Icono nombre={t.icono} color="#FFFFFF" tamano={14} grosor={2.2} />
                <Text style={styles.tipoTexto}>{tipo}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.titulo, { color: t.texto }]}>{act.titulo}</Text>
        </View>

        <View style={styles.cuerpo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver el perfil de ${act.organizacion?.nombre}`}
            onPress={() => navigation.navigate('Organizacion', { id: act.organizacionId })}
            style={({ pressed }) => [styles.org, pressed && { opacity: 0.75 }]}
          >
            <View style={[styles.orgLogo, { backgroundColor: colores.coral }]}>
              <Icono nombre="organizaciones" color="#FFFFFF" tamano={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orgEtiqueta}>Organiza</Text>
              <Text style={styles.orgNombre} numberOfLines={1}>
                {act.organizacion?.nombre}
              </Text>
            </View>
            <Text style={styles.orgVer}>Ver perfil →</Text>
          </Pressable>

          <View style={styles.datos}>
            <Dato etiqueta="FECHA" valor={`${dia} ${mes.toLowerCase()}`} />
            <Dato etiqueta="HORARIO" valor={`${hora(act.fechaInicio)}–${hora(act.fechaFin)}`} />
            <Dato etiqueta="LUGARES" valor={ilimitado ? 'Ilimitados' : `${act.cupo - act.cuposLibres}/${act.cupo}`} />
          </View>
          <Text style={styles.fechaLarga}>{fechaLarga(act.fechaInicio).replace(/^./, (c) => c.toUpperCase())}</Text>

          {act.direccion ? (
            <Pressable accessibilityRole="button" onPress={() => act.ubicacion && abrirComoLlegar(act)} style={styles.lugar}>
              <Icono nombre="mapa" color={colores.coral} tamano={20} />
              <Text style={styles.lugarTexto}>
                {act.direccion} · <Text style={styles.lugarLink}>Cómo llegar</Text>
              </Text>
            </Pressable>
          ) : null}

          <Text style={styles.descripcion}>{act.descripcion}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Feed', { proyectoId: act.id, titulo: act.titulo, organizacionId: act.organizacionId })}
            style={styles.novedades}
          >
            <Text style={styles.novedadesTexto}>Novedades de la actividad →</Text>
          </Pressable>
        </View>
      </ScrollView>

      {esVoluntario ? (
        <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, espacio.l) + 6 }]}>
          {usuario.esJudicial ? (
            <View style={styles.horas}>
              <Text style={styles.horasEtiqueta}>Sumás</Text>
              <Text style={styles.horasValor}>
                {horas} {horas === 1 ? 'hora' : 'horas'}
              </Text>
            </View>
          ) : null}
          {miInscripcion && miInscripcion.asistencia ? (
            // Ya marcó asistencia: texto común, sin card
            <View style={styles.asistencia}>
              <Icono nombre={miInscripcion.asistencia === 'validada' ? 'check' : 'reloj'} color={colores.tinta} tamano={18} grosor={2.2} />
              <Text style={styles.asistenciaTexto}>
                <Text style={styles.asistenciaTitulo}>{miInscripcion.asistencia === 'validada' ? 'Asistencia validada' : 'Ya marcaste tu asistencia'}</Text>
                {miInscripcion.asistencia === 'validada' ? ' · ¡Gracias por sumarte!' : ' · esperando validación'}
              </Text>
            </View>
          ) : miInscripcion && miInscripcion.estado === 'aceptada' && enHorarioQR ? (
            // Confirmado/a y es el momento: desde acá mismo marca la asistencia escaneando el QR
            <View style={{ flex: 1 }}>
              <View style={styles.confirmadoFila}>
                <Icono nombre="check" color={colores.tinta} tamano={15} grosor={2.4} />
                <Text style={styles.confirmadoTexto}>¡Estás confirmado/a!</Text>
              </View>
              <Boton titulo="Marcar asistencia con QR" icono="qr" onPress={() => navigation.navigate('EscanearQR', { actividadId: id, titulo: act.titulo })} />
            </View>
          ) : miInscripcion ? (
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Inicio', { screen: 'MisInscripciones' })} style={[styles.estado, styles[`estado_${miInscripcion.estado}`]]}>
              <Icono nombre={miInscripcion.estado === 'rechazada' ? 'cerrar' : miInscripcion.estado === 'aceptada' ? 'check' : 'reloj'} color={colores.tintaFija} tamano={20} grosor={2.2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.estadoTitulo}>
                  {miInscripcion.estado === 'aceptada' ? '¡Estás confirmado/a!' : miInscripcion.estado === 'rechazada' ? 'Tu inscripción no fue aceptada' : 'Ya te anotaste'}
                </Text>
                <Text style={styles.estadoTexto}>
                  {miInscripcion.estado === 'aceptada'
                    ? yaTermino
                      ? 'La actividad ya terminó.'
                      : `Te esperamos el ${fechaLarga(act.fechaInicio)} a las ${hora(act.fechaInicio)}. Ese día marcás tu asistencia acá.`
                    :miInscripcion.estado === 'rechazada' ? 'Podés buscar otra actividad.' : 'Esperando que la organización confirme tu lugar.'}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Boton titulo={sinLugar ? 'Sin lugares' : 'Quiero sumarme'} onPress={inscribir} cargando={enviando || (mias.cargando && !mias.datos)} deshabilitado={sinLugar} estilo={{ flex: 1 }} />
          )}
        </View>
      ) : null}
    </View>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  portada: { paddingHorizontal: espacio.xl, paddingBottom: 26, minHeight: 300, justifyContent: 'space-between', overflow: 'hidden' },
  // Palabra decorativa de fondo: ancho fijo grande para que nunca se corte en dos líneas ni muestre "...";
  // lo que sobra queda tapado por el borde de la portada.
  fondoPalabra: { position: 'absolute', left: -8, bottom: -38, width: 1400, fontFamily: fuentes.numero, fontSize: 118, letterSpacing: -5 },
  portadaFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  atras: { width: 44, height: 44, borderRadius: 22, backgroundColor: colores.crema, alignItems: 'center', justifyContent: 'center' },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colores.tintaFija, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tipoTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: '#FFFFFF' },
  titulo: { ...tituloGrande(38), marginTop: 60 },

  cuerpo: { padding: espacio.xl, paddingTop: espacio.l },
  org: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 20, padding: 10, paddingRight: 14 },
  orgLogo: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  orgEtiqueta: { fontFamily: fuentes.texto, fontSize: 12, color: colores.tintaSuave },
  orgNombre: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  orgVer: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.coral },

  datos: { flexDirection: 'row', gap: 10, marginTop: espacio.l },
  dato: { flex: 1, borderWidth: 1.5, borderColor: colores.borde, borderRadius: 18, padding: 12 },
  datoEtiqueta: { fontFamily: fuentes.negrita, fontSize: 11, color: colores.tintaSuave },
  datoValor: { fontFamily: fuentes.tituloMedio, fontSize: 19, color: colores.tinta, marginTop: 4 },
  fechaLarga: { fontFamily: fuentes.textoMedio, fontSize: 13, color: colores.tintaSuave, marginTop: 10 },

  lugar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: espacio.l },
  lugarTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: 14, color: colores.tinta },
  lugarLink: { fontFamily: fuentes.negrita },
  descripcion: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 23, color: colores.tintaSuave, marginTop: espacio.l },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', marginTop: espacio.m },
  novedades: { marginTop: espacio.m, paddingVertical: espacio.s },
  novedadesTexto: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.tintaSuave },

  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colores.tarjeta, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 14, paddingHorizontal: 20 },
  estado: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginVertical: 5 },
  confirmadoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  confirmadoTexto: { fontFamily: fuentes.negrita, fontSize: 13.5, color: colores.tinta },
  asistencia: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  asistenciaTitulo: { fontFamily: fuentes.negrita },
  asistenciaTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: 14.5, color: colores.tinta },
  estado_pendiente: { backgroundColor: colores.sol },
  estado_aceptada: { backgroundColor: colores.menta },
  estado_rechazada: { backgroundColor: colores.lila },
  estadoTitulo: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tintaFija },
  estadoTexto: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaFija, marginTop: 1 },
  horas: { paddingLeft: 4 },
  horasEtiqueta: { fontFamily: fuentes.textoMedio, fontSize: 12, color: colores.tintaSuave },
  horasValor: { fontFamily: fuentes.numero, fontSize: 21, color: colores.tinta, letterSpacing: -0.4 },
}));
