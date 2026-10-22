import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, estilosDinamicos, fuentes, sombra } from '../constants/tema';
import Icono from './Icono';

// Familia de color de la "burbuja" de cada pestaña activa (en orden).
const TONOS = ['coral'];

/** Barra de pestañas flotante: la pestaña activa se agranda en una burbuja coral con su nombre. */
export default function BarraPestanas({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.contenedor, { paddingBottom: Math.max(insets.bottom, espacio.s) }]}>
      <View style={styles.barra}>
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const activa = state.index === i;
          const etiqueta = options.title ?? route.name;
          const alTocar = () => {
            const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!activa && !evento.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pestana
              key={route.key}
              activa={activa}
              icono={options.tabBarIcono}
              etiqueta={etiqueta}
              tono={TONOS[i % TONOS.length]}
              onPress={alTocar}
            />
          );
        })}
      </View>
    </View>
  );
}

function Pestana({ activa, icono, etiqueta, tono, onPress }) {
  const v = useRef(new Animated.Value(activa ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: activa ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: 9 }).start();
  }, [activa, v]);

  const fondo = v.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', colores[tono]] });
  const colorActivo = colores.blanco;

  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: activa }} accessibilityLabel={etiqueta} onPress={onPress} style={[styles.pestana, activa && styles.pestanaActiva]}>
      <Animated.View style={[styles.burbuja, { backgroundColor: fondo }]}>
        <Icono nombre={icono} color={activa ? colorActivo : colores.tintaSuave} tamano={22} />
        {activa ? (
          <Text numberOfLines={1} style={[styles.etiqueta, { color: colorActivo }]}>
            {etiqueta}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { backgroundColor: colores.crema, paddingHorizontal: espacio.m, paddingTop: espacio.s },
  barra: {
    flexDirection: 'row',
    backgroundColor: colores.tarjeta,
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: colores.borde,
    ...sombra,
  },
  pestana: { flex: 1, alignItems: 'center' },
  pestanaActiva: { flex: 2.2 },
  burbuja: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 12, alignSelf: 'stretch' },
  etiqueta: { fontFamily: fuentes.negrita, fontSize: 13, marginLeft: 6, flexShrink: 1 },
}));
