import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Easing, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono from '../../components/Icono';
import FondoTipo from '../../components/FondoTipo';
import CartaHistoria from '../../components/CartaHistoria';
import VisorFoto from '../../components/VisorFoto';
import { Boton, Cargando, MensajeError } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { editarHistoria, historiasPendientes, misHistorias } from '../../api/historias';
import { mensajeDeError } from '../../api/client';
import { elegirYSubir } from '../../utils/fotos';
import { colores, espacio, estilosDinamicos, fuentes, paletas, tituloGrande } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { diaMes } from '../../utils/formato';

const PASO = 92; // cuánto se ve de cada card en la pila
const ALTO = 230;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const MAX_FOTOS = 20;

/**
 * Mi historia: el anuario del voluntario. Las actividades que contó, apiladas como tarjetas de una
 * billetera, cada una del color de su tipo. Tocar una la levanta; "Ver" la abre a pantalla completa.
 */
export default function MiHistoriaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const historias = useCarga(() => misHistorias(), []);
  const pendientes = useCarga(() => historiasPendientes(), []);
  const [levantada, setLevantada] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [origen, setOrigen] = useState(null); // dónde está la card en la pantalla: de ahí sale (y ahí vuelve) el color
  const raiz = useRef(null);
  const pila = useRef(null);

  const lista = historias.datos || [];
  const cuantasPendientes = (pendientes.datos || []).length;
  const primera = lista.length ? lista[lista.length - 1] : null;
  const desde = primera?.actividad ? MESES[new Date(primera.actividad.fechaInicio).getMonth()] : null;
  const anio = lista[0]?.actividad ? new Date(lista[0].actividad.fechaInicio).getFullYear() : new Date().getFullYear();

  const actualizar = (h) => {
    historias.setDatos((l) => (l || []).map((x) => (x.id === h.id ? h : x)));
    setAbierta(h);
  };

  if (historias.cargando && !historias.datos) return <Cargando />;

  return (
    <View ref={raiz} style={styles.contenedor}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + espacio.l, paddingBottom: insets.bottom + espacio.xxl }}>
        <View style={styles.relleno}>
          <View style={styles.arriba}>
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.volver} hitSlop={8}>
              <Icono nombre="izquierda" color={colores.tintaSuave} tamano={18} />
              <Text style={styles.volverTexto}>Perfil</Text>
            </Pressable>
            {cuantasPendientes > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('HistoriasPendientes')} style={styles.porAgregar}>
                <Text style={styles.porAgregarMas}>+</Text>
                <Text style={styles.porAgregarTexto}>Por agregar · {cuantasPendientes}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.titulo}>Mi historia</Text>
          <View style={styles.resumen}>
            <View style={styles.anio}>
              <Text style={styles.anioTexto}>{anio}</Text>
            </View>
            <Text style={styles.resumenTexto}>
              {lista.length === 0 ? 'Todavía no contaste ninguna actividad' : `${lista.length} ${lista.length === 1 ? 'actividad' : 'actividades'}${desde ? ` desde ${desde}` : ''}`}
            </Text>
          </View>
          <MensajeError texto={historias.error} onReintentar={historias.recargar} />
        </View>

        {lista.length === 0 ? (
          <View style={[styles.relleno, styles.vacio]}>
            <Text style={styles.vacioTexto}>
              Cuando vayas a una actividad y marques tu asistencia, la vas a poder contar acá: qué hiciste, a quién conociste y tus fotos del día.
            </Text>
            {cuantasPendientes > 0 ? <Boton titulo="Contar mi primera actividad" onPress={() => navigation.navigate('HistoriasPendientes')} /> : null}
          </View>
        ) : (
          <View ref={pila} collapsable={false} style={[styles.pila, { height: (lista.length - 1) * PASO + ALTO + 40 }]}>
            {lista.map((h, i) => (
              <CardPila key={h.id} historia={h} indice={i} arriba={levantada === h.id} onTocar={() => setLevantada(h.id)} onBajar={() => setLevantada(null)} onVer={() => {
                // Medimos la card en reposo (la pila + su lugar) para que el color salga de ahí y vuelva ahí.
                pila.current?.measureInWindow((px, py, pw) => {
                  raiz.current?.measureInWindow((rx, ry) => {
                    setOrigen({ x: px - rx, y: py - ry + i * PASO, w: pw, h: ALTO });
                    setLevantada(null);
                    setAbierta(h);
                  });
                });
              }} />
            ))}
            {/* Con una card levantada, tocar en cualquier otro lado la baja (no levanta otra). */}
            {levantada ? <Pressable accessibilityLabel="Volver a la pila" onPress={() => setLevantada(null)} style={[styles.capa, { zIndex: 30, elevation: 30 }]} /> : null}
          </View>
        )}
      </ScrollView>

      {abierta ? <HistoriaAbierta historia={abierta} origen={origen} onCerrar={() => setAbierta(null)} onCambio={actualizar} /> : null}
    </View>
  );
}

/** Una card de la pila: color del tipo, ícono, tipo en mayúscula, nombre y fecha arriba de todo. */
function CardPila({ historia, indice, arriba, onTocar, onBajar, onVer }) {
  const a = historia.actividad || {};
  const t = estiloTipo(a.tipo);
  const sube = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(sube, { toValue: arriba ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
  }, [arriba, sube]);
  const { dia, mes } = a.fechaInicio ? diaMes(a.fechaInicio) : { dia: '', mes: '' };
  const translateY = sube.interpolate({ inputRange: [0, 1], outputRange: [0, -110] });
  const scale = sube.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <Animated.View style={[styles.card, { top: indice * PASO, zIndex: arriba ? 40 : Math.min(indice + 1, 25), elevation: arriba ? 40 : Math.min(indice + 1, 25), backgroundColor: t.color, transform: [{ translateY }, { scale }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={a.titulo} onPress={arriba ? onBajar : onTocar} style={styles.cardToque}>
        <View style={styles.cardBurbuja} />
        <View style={styles.cardIconoGrande}>
          <Icono nombre={t.icono} color={paletas.claro.tinta} tamano={60} grosor={1.6} />
        </View>
        <View style={styles.cardFila}>
          <View style={[styles.cardIcono, { backgroundColor: t.clarito }]}>
            <Icono nombre={t.icono} color={paletas.claro.tinta} tamano={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTipo} numberOfLines={1}>
              {(a.tipo || 'Actividad').toUpperCase()}
            </Text>
            <Text style={styles.cardTitulo} numberOfLines={1}>
              {a.titulo}
            </Text>
          </View>
          <Text style={styles.cardFecha}>
            {dia} {mes}
          </Text>
        </View>
      </Pressable>
      {arriba ? (
        <Pressable accessibilityRole="button" onPress={onVer} style={styles.ver}>
          <Text style={styles.verTexto}>Ver</Text>
          <Icono nombre="derecha" color={paletas.claro.tinta} tamano={16} grosor={2.4} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/**
 * La historia abierta: el color del tipo sale de la card, crece hasta llenar la pantalla y después aparece la carta.
 * Al cerrar es al revés: se va la carta, el color se achica de vuelta hasta la card y la card queda en su lugar de la pila.
 */
function HistoriaAbierta({ historia, origen, onCerrar, onCambio }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const o = origen || { x: 0, y: height * 0.35, w: width, h: ALTO };
  const cerrando = useRef(false);
  const crece = useRef(new Animated.Value(0)).current;
  const contenido = useRef(new Animated.Value(0)).current;
  const [foto, setFoto] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    Animated.timing(crece, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() =>
      Animated.timing(contenido, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    );
  }, [crece, contenido]);

  const cerrar = () => {
    if (cerrando.current) return;
    cerrando.current = true;
    Animated.timing(contenido, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() =>
      Animated.timing(crece, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(onCerrar)
    );
  };

  // El botón "atrás" de Android también cierra con la animación.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cerrar();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agregarFotos = async () => {
    const lugar = MAX_FOTOS - historia.fotoIds.length;
    if (lugar <= 0) return Alert.alert('Mi historia', `Una historia puede tener hasta ${MAX_FOTOS} fotos.`);
    setSubiendo(true);
    try {
      const nuevas = await elegirYSubir('historia', { multiples: true, limite: lugar });
      if (nuevas.length) {
        const h = await editarHistoria(historia.id, { fotos: [...historia.fotoIds, ...nuevas.map((n) => n.id)] });
        onCambio(h);
      }
    } catch (e) {
      Alert.alert('No se pudieron agregar las fotos', mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  };

  // El color va del rectángulo de la card a toda la pantalla (y vuelve).
  const marco = {
    left: crece.interpolate({ inputRange: [0, 1], outputRange: [o.x, 0] }),
    top: crece.interpolate({ inputRange: [0, 1], outputRange: [o.y, 0] }),
    width: crece.interpolate({ inputRange: [0, 1], outputRange: [o.w, width] }),
    height: crece.interpolate({ inputRange: [0, 1], outputRange: [o.h, height] }),
    borderRadius: crece.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }),
  };
  const subir = contenido.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={[styles.capa, { zIndex: 50, elevation: 50 }]} pointerEvents="box-none">
      <Animated.View style={[{ position: 'absolute', overflow: 'hidden' }, marco]}>
        {/* El dibujo queda quieto en la pantalla: el marco que se agranda lo va "destapando". */}
        <Animated.View style={{ position: 'absolute', width, height, left: Animated.multiply(marco.left, -1), top: Animated.multiply(marco.top, -1) }}>
          <FondoTipo tipo={historia.actividad?.tipo} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={{ flex: 1, opacity: contenido, transform: [{ translateY: subir }] }}>
        <View style={[styles.barraAbierta, { paddingTop: insets.top + espacio.s }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={cerrar} style={styles.circuloBlanco}>
            <Icono nombre="izquierda" color={paletas.claro.tinta} tamano={20} />
          </Pressable>
          <View style={styles.pildora}>
            <Text style={styles.pildoraTexto}>Mi historia</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Agregar fotos" onPress={agregarFotos} disabled={subiendo} style={styles.vidrio}>
            <Icono nombre="camara" color={paletas.claro.tinta} tamano={22} />
            <View style={styles.vidrioMas}>
              <Text style={styles.vidrioMasTexto}>{subiendo ? '…' : '+'}</Text>
            </View>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
          <CartaHistoria actividad={historia.actividad} organizacion={historia.organizacion} relato={historia.relato} fotos={historia.fotos} onFoto={setFoto} />
        </ScrollView>
      </Animated.View>
      <VisorFoto ruta={foto} onCerrar={() => setFoto(null)} />
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  relleno: { paddingHorizontal: espacio.xl },
  arriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volverTexto: { fontFamily: fuentes.texto, fontSize: 14, color: colores.tintaSuave },
  porAgregar: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde },
  porAgregarMas: { fontFamily: fuentes.negrita, fontSize: 17, lineHeight: 19, color: colores.tinta },
  porAgregarTexto: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.tinta },
  titulo: { ...tituloGrande(48), color: colores.tinta, marginTop: espacio.m },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: espacio.l },
  anio: { backgroundColor: colores.tinta, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  anioTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.crema },
  resumenTexto: { fontFamily: fuentes.texto, fontSize: 13.5, color: colores.tintaSuave },
  vacio: { gap: espacio.l, marginTop: espacio.l },
  vacioTexto: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 22, color: colores.tintaSuave },

  pila: { marginHorizontal: espacio.l, marginTop: espacio.s },
  card: { position: 'absolute', left: 0, right: 0, height: ALTO, borderRadius: 26, overflow: 'hidden', shadowColor: '#073B4C', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: -3 } },
  cardToque: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  cardBurbuja: { position: 'absolute', right: -40, bottom: -70, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.35)' },
  cardIconoGrande: { position: 'absolute', right: 24, bottom: 24, opacity: 0.85 },
  cardFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcono: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTipo: { fontFamily: fuentes.negrita, fontSize: 11, letterSpacing: 0.5, color: paletas.claro.tinta, opacity: 0.75 },
  cardTitulo: { fontFamily: fuentes.negrita, fontSize: 17, color: paletas.claro.tinta },
  cardFecha: { fontFamily: fuentes.numero, fontSize: 14, color: paletas.claro.tinta },
  ver: { position: 'absolute', left: 16, bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFFFFF' },
  verTexto: { fontFamily: fuentes.negrita, fontSize: 14, color: paletas.claro.tinta },

  capa: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  barraAbierta: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  circuloBlanco: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pildora: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pildoraTexto: { fontFamily: fuentes.negrita, fontSize: 13, color: paletas.claro.tinta },
  vidrio: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  vidrioMas: { position: 'absolute', right: -3, top: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: paletas.claro.tinta, alignItems: 'center', justifyContent: 'center' },
  vidrioMasTexto: { fontFamily: fuentes.negrita, fontSize: 13, lineHeight: 15, color: '#FFFFFF' },
}));
