import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colores, estilosDinamicos, fuentes, paletas } from '../constants/tema';

/*
 * Logo de Mano Amiga: un corazón armado con dos mitades (dos manos que se encuentran).
 * Coral a la izquierda, sol (amarillo) a la derecha, con una separación fina en el medio.
 * Los colores del logo son fijos: no cambian con el tema.
 */

const IZQ = 'M48 88 C19 67 3 51 3 32 C3 17 14 7 27 7 C37 7 44 13 48 21 Z';
const DER = 'M52 88 C81 67 97 51 97 32 C97 17 86 7 73 7 C63 7 56 13 52 21 Z';
const CORAL = paletas.claro.coral;
const SOL = paletas.claro.sol;

/** Marca sola (sin texto), estática. */
export function LogoMarca({ tamano = 48, opacidad = 1 }) {
  return (
    <Svg width={tamano} height={tamano * 0.92} viewBox="0 0 100 92" opacity={opacidad}>
      <Path d={IZQ} fill={CORAL} />
      <Path d={DER} fill={SOL} />
    </Svg>
  );
}

/**
 * Logo animado (se usa solo en el ingreso): las dos mitades se acercan hasta encontrarse
 * y después el corazón queda latiendo (doble latido, pausa). Si el sistema pide reducir movimiento, aparece quieto.
 */
export function LogoAnimado({ tamano = 120, conNombre = true }) {
  const juntar = useRef(new Animated.Value(0)).current;
  const latido = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelado = false;
    let bucle = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (cancelado) return;
      if (reducir) {
        juntar.setValue(1);
        return;
      }
      const golpe = (escala, ms) => Animated.timing(latido, { toValue: escala, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
      bucle = Animated.loop(Animated.sequence([golpe(1.08, 150), golpe(1, 170), golpe(1.05, 130), golpe(1, 260), Animated.delay(700)]));
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(juntar, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && !cancelado) bucle.start();
      });
    });
    return () => {
      cancelado = true;
      if (bucle) bucle.stop();
    };
  }, [juntar, latido]);

  const separacion = tamano * 0.22;
  const izqX = juntar.interpolate({ inputRange: [0, 1], outputRange: [-separacion, 0] });
  const derX = juntar.interpolate({ inputRange: [0, 1], outputRange: [separacion, 0] });
  const opacidad = juntar.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  const alto = tamano * 0.92;

  return (
    <View style={styles.contenedor} accessible accessibilityRole="image" accessibilityLabel="Mano Amiga">
      <Animated.View style={{ width: tamano, height: alto, transform: [{ scale: latido }] }}>
        <Animated.View style={[styles.capa, { opacity: opacidad, transform: [{ translateX: izqX }] }]}>
          <Svg width={tamano} height={alto} viewBox="0 0 100 92">
            <Path d={IZQ} fill={CORAL} />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.capa, { opacity: opacidad, transform: [{ translateX: derX }] }]}>
          <Svg width={tamano} height={alto} viewBox="0 0 100 92">
            <Path d={DER} fill={SOL} />
          </Svg>
        </Animated.View>
      </Animated.View>
      {conNombre ? <Text style={styles.nombre}>Mano Amiga</Text> : null}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { alignItems: 'center' },
  capa: { position: 'absolute', top: 0, left: 0 },
  nombre: { fontFamily: fuentes.titulo, fontSize: 36, color: colores.tinta, marginTop: 14 },
}));
