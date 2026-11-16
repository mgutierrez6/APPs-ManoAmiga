import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, estilosDinamicos, fuentes } from '../constants/tema';
import Icono from './Icono';

/**
 * Menú de abajo: la pestaña activa es una "pastilla" azul oscuro con el ícono y el nombre;
 * las demás muestran solo el ícono (con su nombre para lectores de pantalla).
 */
export default function BarraPestanas({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const pocas = state.routes.length <= 3;
  return (
    <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, espacio.m) }, pocas && { justifyContent: 'space-around' }]}>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const activa = state.index === i;
        const etiqueta = options.title ?? route.name;
        const alTocar = () => {
          const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!activa && !evento.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={etiqueta}
            onPress={alTocar}
            hitSlop={6}
            style={({ pressed }) => [activa ? styles.activa : styles.pestana, pressed && { opacity: 0.7 }]}
          >
            <Icono nombre={options.tabBarIcono} color={activa ? colores.crema : colores.tintaSuave} tamano={activa ? 18 : 22} grosor={2} />
            {activa ? (
              <Text numberOfLines={1} style={styles.etiqueta}>
                {etiqueta}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colores.crema,
    paddingTop: espacio.m,
    paddingHorizontal: espacio.l,
  },
  pestana: { padding: 11 },
  activa: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colores.tinta, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, maxWidth: 190 },
  etiqueta: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.crema },
}));
