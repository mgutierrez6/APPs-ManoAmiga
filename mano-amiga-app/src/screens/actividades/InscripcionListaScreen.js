import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Icono from '../../components/Icono';
import { useAuth } from '../../hooks/useAuth';
import { colores, espacio, estilosDinamicos, fuentes, paletas, tituloGrande } from '../../constants/tema';
import { diaMes, hora } from '../../utils/formato';

const IZQ = 'M48 88 C19 67 3 51 3 32 C3 17 14 7 27 7 C37 7 44 13 48 21 Z';
const DER = 'M52 88 C81 67 97 51 97 32 C97 17 86 7 73 7 C63 7 56 13 52 21 Z';
const ROSA = paletas.claro.coral;
const SOL = paletas.claro.sol;

/**
 * "¡Listo, te sumaste!": aparece al inscribirse. El fondo rosa se abre desde abajo y, al tocar
 * "Seguir explorando", las dos mitades del corazón (rosa y amarillo) se juntan abajo, suben y se desvanecen.
 */
export default function InscripcionListaScreen({ route, navigation }) {
  const { actividad } = route.params || {};
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const alto = Dimensions.get('window').height;
  const entrada = useRef(new Animated.Value(0)).current;
  const salida = useRef(new Animated.Value(0)).current;
  const [saliendo, setSaliendo] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      setSinMovimiento(reducir);
      if (reducir) entrada.setValue(1);
      else Animated.timing(entrada, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  }, [entrada]);

  const irA = (pestana) => navigation.reset({ index: 0, routes: [{ name: 'Inicio', params: { screen: pestana } }] });

  const seguirExplorando = () => {
    if (sinMovimiento) return irA('Actividades');
    setSaliendo(true);
    Animated.timing(salida, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }).start(() => irA('Actividades'));
  };

  const horas = actividad ? Math.round(((new Date(actividad.fechaFin) - new Date(actividad.fechaInicio)) / 3600000) * 10) / 10 : 0;
  const { dia, mes } = actividad ? diaMes(actividad.fechaInicio) : { dia: '', mes: '' };

  // Entrada: el fondo crece desde abajo y el contenido sube.
  const escalaFondo = entrada.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const subir = entrada.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  // Salida: el contenido se va, el fondo se achica y el corazón se arma abajo y sube.
  const contenidoSale = salida.interpolate({ inputRange: [0, 0.2], outputRange: [1, 0], extrapolate: 'clamp' });
  const fondoSale = salida.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' });
  const izqX = salida.interpolate({ inputRange: [0, 0.3, 0.42, 1], outputRange: [-60, -60, 0, 0] });
  const derX = salida.interpolate({ inputRange: [0, 0.3, 0.42, 1], outputRange: [60, 60, 0, 0] });
  const mitades = salida.interpolate({ inputRange: [0, 0.3, 0.42, 1], outputRange: [0, 0, 1, 1] });
  const corazonY = salida.interpolate({ inputRange: [0, 0.52, 0.8, 1], outputRange: [0, 0, -alto * 0.42, -alto * 0.42] });
  const corazonEscala = salida.interpolate({ inputRange: [0, 0.45, 0.5, 0.55, 0.8, 1], outputRange: [1, 1, 1.12, 1, 1.1, 1.35] });
  const corazonOpacidad = salida.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <View style={styles.contenedor}>
      <Animated.View style={[styles.fondo, { opacity: fondoSale, transform: [{ scale: escalaFondo }] }]}>
        <View style={styles.anillo} />
        <View style={styles.circulo} />
        <View style={styles.puntito} />
      </Animated.View>

      <Animated.View style={[styles.contenido, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + espacio.xl, opacity: Animated.multiply(entrada, contenidoSale), transform: [{ translateY: subir }] }]}>
        <View style={styles.check}>
          <Icono nombre="check" color={colores.coral} tamano={44} grosor={2.6} />
        </View>
        <Text style={styles.titulo}>¡Listo,{'\n'}te sumaste!</Text>
        <Text style={styles.texto}>
          {actividad?.organizacion?.nombre || 'La organización'} va a confirmar tu lugar. Te avisamos por notificación.
        </Text>
        {actividad ? (
          <View style={styles.tarjeta}>
            <View style={styles.fecha}>
              <Text style={styles.dia}>{dia}</Text>
              <Text style={styles.mes}>{mes}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actTitulo} numberOfLines={2}>
                {actividad.titulo}
              </Text>
              <Text style={styles.actLinea}>
                {hora(actividad.fechaInicio)} a {hora(actividad.fechaFin)}
                {usuario?.esJudicial ? ` · sumás ${horas} ${horas === 1 ? 'hora' : 'horas'}` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.botones}>
          <Pressable accessibilityRole="button" disabled={saliendo} onPress={() => irA('MisInscripciones')} style={({ pressed }) => [styles.botonBlanco, pressed && { opacity: 0.85 }]}>
            <Text style={styles.botonBlancoTexto}>Ver mis inscripciones</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={saliendo} onPress={seguirExplorando} style={styles.botonTexto}>
            <Text style={styles.botonTextoTexto}>Seguir explorando</Text>
          </Pressable>
        </View>
      </Animated.View>

      {saliendo ? (
        <Animated.View pointerEvents="none" style={[styles.corazon, { bottom: insets.bottom + 40, opacity: corazonOpacidad, transform: [{ translateY: corazonY }, { scale: corazonEscala }] }]}>
          <Animated.View style={[styles.capa, { opacity: mitades, transform: [{ translateX: izqX }] }]}>
            <Svg width={120} height={110} viewBox="0 0 100 92">
              <Path d={IZQ} fill={ROSA} />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.capa, { opacity: mitades, transform: [{ translateX: derX }] }]}>
            <Svg width={120} height={110} viewBox="0 0 100 92">
              <Path d={DER} fill={SOL} />
            </Svg>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  fondo: { ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, backgroundColor: ROSA, overflow: 'hidden' },
  anillo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 36, borderColor: SOL, right: -110, top: -80 },
  circulo: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: SOL, right: 30, top: 230 },
  puntito: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: SOL, left: 40, bottom: 210 },
  contenido: { flex: 1, paddingHorizontal: 28 },
  check: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  titulo: { ...tituloGrande(54), color: '#FFFFFF', marginTop: 32 },
  texto: { fontFamily: fuentes.texto, fontSize: 16, lineHeight: 24, color: '#FFFFFF', marginTop: 16 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginTop: 28 },
  fecha: { width: 52, alignItems: 'center' },
  dia: { fontFamily: fuentes.numero, fontSize: 30, lineHeight: 32, color: paletas.claro.tinta },
  mes: { fontFamily: fuentes.negrita, fontSize: 11, color: paletas.claro.tintaSuave },
  actTitulo: { fontFamily: fuentes.negrita, fontSize: 15, color: paletas.claro.tinta },
  actLinea: { fontFamily: fuentes.texto, fontSize: 13, color: paletas.claro.tintaSuave, marginTop: 2 },
  botones: { marginTop: 'auto', gap: 10 },
  botonBlanco: { height: 56, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  botonBlancoTexto: { fontFamily: fuentes.negrita, fontSize: 16, color: paletas.claro.coralOscuro },
  botonTexto: { height: 48, alignItems: 'center', justifyContent: 'center' },
  botonTextoTexto: { fontFamily: fuentes.negrita, fontSize: 15, color: '#FFFFFF' },
  corazon: { position: 'absolute', alignSelf: 'center', width: 120, height: 110 },
  capa: { position: 'absolute', left: 0, top: 0 },
}));
