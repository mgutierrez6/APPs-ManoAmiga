import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colores, espacio, estilosDinamicos, estilosEstado, familiaPara, fuentes, radio, sombra } from '../constants/tema';
import { estadoTexto } from '../utils/formato';
import { LogoMarca } from './Logo';

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

export function Texto({ children, estilo, negrita = false, ...props }) {
  return (
    <Text style={[styles.texto, negrita && { fontFamily: fuentes.negrita }, estilo]} {...props}>
      {children}
    </Text>
  );
}

export function Titulo({ children, estilo }) {
  return <Text style={[styles.titulo, estilo]}>{children}</Text>;
}

export function Subtitulo({ children, estilo }) {
  return <Text style={[styles.subtitulo, estilo]}>{children}</Text>;
}

export function TextoSuave({ children, estilo, ...props }) {
  return (
    <Text style={[styles.textoSuave, estilo]} {...props}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Botón "3D": tiene un borde inferior más oscuro que se hunde al tocar */
/* ------------------------------------------------------------------ */

const VARIANTES = estilosDinamicos(() => ({
  primario: { fondo: colores.coral, sombra: colores.coralOscuro, texto: colores.blanco },
  secundario: { fondo: colores.oceano, sombra: colores.oceanoOscuro, texto: colores.blanco },
  exito: { fondo: colores.menta, sombra: colores.mentaOscuro, texto: colores.tintaFija },
  sol: { fondo: colores.sol, sombra: colores.solOscuro, texto: colores.tintaFija },
  lila: { fondo: colores.lila, sombra: colores.lilaOscuro, texto: colores.blanco },
  peligro: { fondo: colores.peligro, sombra: '#A3173A', texto: colores.blanco },
  borde: { fondo: colores.tarjeta, sombra: colores.borde, texto: colores.tinta, borde: colores.tinta },
}));

export function Boton({ titulo, onPress, variante = 'primario', cargando = false, deshabilitado = false, estilo, chico = false }) {
  const v = VARIANTES[variante] || VARIANTES.primario;
  const escala = useRef(new Animated.Value(1)).current;
  const inactivo = deshabilitado || cargando;

  const animar = (a) => Animated.spring(escala, { toValue: a, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, styles.botonContenedor, estilo]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactivo }}
        onPress={onPress}
        disabled={inactivo}
        onPressIn={() => animar(0.96)}
        onPressOut={() => animar(1)}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.boton,
              chico && styles.botonChico,
              {
                backgroundColor: v.fondo,
                borderBottomColor: v.sombra,
                borderBottomWidth: pressed ? 1 : 3,
                marginTop: pressed ? 2 : 0,
                opacity: inactivo ? 0.55 : 1,
              },
              v.borde && { borderWidth: 2, borderColor: v.borde, borderBottomColor: v.borde },
            ]}
          >
            {cargando ? (
              <ActivityIndicator color={v.texto} />
            ) : (
              <Text style={[styles.botonTexto, chico && styles.botonTextoChico, { color: v.texto }]}>
                {titulo}
              </Text>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Formularios                                                         */
/* ------------------------------------------------------------------ */

export function Campo({ etiqueta, error, icono: _icono, onFocus, onBlur, ...props }) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={styles.campo}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}
      <View style={[styles.inputCaja, foco && styles.inputFoco, error && styles.inputError, props.multiline && styles.inputMultilinea]}>
        <TextInput
          placeholderTextColor={colores.gris}
          style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
          onFocus={(e) => {
            setFoco(true);
            onFocus && onFocus(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur && onBlur(e);
          }}
          {...props}
        />
      </View>
      {error ? <Text style={styles.textoError}>{error}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Contenedores                                                        */
/* ------------------------------------------------------------------ */

/** Tarjeta blanca redondeada. "acento" pinta una franja de color a la izquierda. */
export function Tarjeta({ children, onPress, estilo, acento }) {
  const contenido = (
    <>
      {acento ? <View style={[styles.acento, { backgroundColor: acento }]} /> : null}
      {children}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.tarjeta, acento && styles.tarjetaConAcento, pressed && styles.tarjetaPresionada, estilo]}>
        {contenido}
      </Pressable>
    );
  }
  return <View style={[styles.tarjeta, acento && styles.tarjetaConAcento, estilo]}>{contenido}</View>;
}

/** Aparece deslizándose hacia arriba (para listas y tarjetas). */
export function Aparecer({ children, indice = 0, estilo }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: Math.min(indice, 8) * 70, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [v, indice]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  return <Animated.View style={[estilo, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/* ------------------------------------------------------------------ */
/* Chips, estados, avatar, progreso                                    */
/* ------------------------------------------------------------------ */

/** Chip de color. "clave" decide el color (misma etiqueta = mismo color siempre). */
export function Chip({ texto, activo = false, onPress, clave }) {
  const f = familiaPara(clave ?? texto);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: f.suave, borderColor: activo ? f.textoSuave : 'transparent' },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <Text style={[styles.chipTexto, { color: activo ? f.textoSuave : colores.tinta }]}>
        {texto}
      </Text>
    </Pressable>
  );
}

export function EstadoBadge({ estado }) {
  const e = estilosEstado[estado] || { fondo: colores.neutroSuave, texto: colores.tintaSuave };
  return (
    <View style={[styles.badge, { backgroundColor: e.fondo }]}>
      <Text style={[styles.badgeTexto, { color: e.texto }]}>
        {estadoTexto[estado] || estado}
      </Text>
    </View>
  );
}

export function Avatar({ nombre = '', apellido = '', tamano = 44 }) {
  const f = familiaPara(`${nombre}${apellido}`);
  const iniciales = `${(nombre[0] || '').toUpperCase()}${(apellido[0] || '').toUpperCase()}` || '?';
  return (
    <View style={[styles.avatar, { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: f.base }]}>
      <Text style={[styles.avatarTexto, { color: f.texto, fontSize: tamano * 0.38 }]}>{iniciales}</Text>
    </View>
  );
}

export function BarraProgreso({ valor = 0, total = 1, color = colores.menta }) {
  const pct = Math.max(0, Math.min(1, total ? valor / total : 0));
  const ancho = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ancho, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [ancho, pct]);
  return (
    <View style={styles.barra}>
      <Animated.View style={[styles.barraRelleno, { backgroundColor: color, width: ancho.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

/** Pastilla de información: texto sobre un tinte de color. */
export function Pastilla({ texto, clave, estilo }) {
  const f = familiaPara(clave ?? texto);
  return (
    <View style={[styles.pastilla, { backgroundColor: f.suave }, estilo]}>
      <Text style={styles.pastillaTexto}>
        {texto}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Estados de pantalla                                                 */
/* ------------------------------------------------------------------ */

/** Tres puntitos que rebotan (indicador de carga). */
export function Cargando() {
  const puntos = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = puntos.map((p, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(p, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tonos = [colores.coral, colores.sol, colores.menta];
  return (
    <View style={styles.centro}>
      <View style={styles.fila}>
        {puntos.map((p, i) => (
          <Animated.View
            key={i}
            style={[styles.punto, { backgroundColor: tonos[i], transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }]}
          />
        ))}
      </View>
    </View>
  );
}

export function MensajeError({ texto, onReintentar }) {
  if (!texto) return null;
  return (
    <View style={styles.error}>
      <Text style={styles.errorTexto}>{texto}</Text>
      {onReintentar ? <Boton titulo="Reintentar" variante="borde" chico onPress={onReintentar} /> : null}
    </View>
  );
}

export function Vacio({ texto, titulo = 'Nada por acá todavía' }) {
  return (
    <View style={styles.vacio}>
      <LogoMarca tamano={64} opacidad={0.35} />
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      <Text style={[styles.textoSuave, { textAlign: 'center' }]}>{texto}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = estilosDinamicos(() => ({
  texto: { fontFamily: fuentes.texto, fontSize: 15, color: colores.tinta },
  titulo: { fontFamily: fuentes.titulo, fontSize: 26, color: colores.tinta, marginBottom: espacio.xs },
  subtitulo: { fontFamily: fuentes.tituloMedio, fontSize: 19, color: colores.tinta, marginTop: espacio.l, marginBottom: espacio.s },
  textoSuave: { fontFamily: fuentes.texto, color: colores.tintaSuave, fontSize: 14, lineHeight: 20 },

  botonContenedor: { marginVertical: 5 },
  boton: { minHeight: 52, paddingHorizontal: espacio.xl, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  botonChico: { minHeight: 40, paddingHorizontal: espacio.l },
  botonTexto: { fontFamily: fuentes.negrita, fontSize: 16, letterSpacing: 0.2 },
  botonTextoChico: { fontSize: 14 },

  campo: { marginBottom: espacio.m },
  etiqueta: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.tintaSuave, marginBottom: 6, marginLeft: 4 },
  inputCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colores.borde,
    borderRadius: 16,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: espacio.m,
  },
  inputFoco: { borderColor: colores.oceano, backgroundColor: colores.campoFoco },
  inputError: { borderColor: colores.peligro },
  inputMultilinea: { alignItems: 'flex-start', paddingTop: 4 },
  inputIcono: { fontSize: 18, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colores.tinta, fontFamily: fuentes.textoMedio },
  textoError: { fontFamily: fuentes.textoMedio, color: colores.peligro, marginTop: espacio.xs, marginLeft: 4 },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radio, padding: espacio.l, marginBottom: espacio.m, borderWidth: 1, borderColor: colores.borde, ...sombra },
  tarjetaConAcento: { paddingLeft: espacio.l + 8, overflow: 'hidden' },
  tarjetaPresionada: { transform: [{ scale: 0.98 }] },
  acento: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },

  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: espacio.s, marginBottom: espacio.s, borderWidth: 1.5 },
  chipTexto: { fontFamily: fuentes.negrita, fontSize: 13 },

  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTexto: { fontFamily: fuentes.negrita, fontSize: 12 },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fuentes.titulo },

  barra: { height: 10, borderRadius: 999, backgroundColor: colores.pista, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 999 },

  pastilla: { flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginRight: 8, marginBottom: 8 },
  pastillaTexto: { fontFamily: fuentes.textoMedio, fontSize: 14, color: colores.tinta },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, minHeight: 160 },
  fila: { flexDirection: 'row', gap: 10 },
  punto: { width: 14, height: 14, borderRadius: 7 },
  error: { backgroundColor: colores.coralSuave, padding: espacio.m, borderRadius: 18, marginBottom: espacio.m },
  errorTexto: { fontFamily: fuentes.textoMedio, color: colores.coralTexto, marginBottom: espacio.xs },
  vacio: { alignItems: 'center', paddingVertical: espacio.xl, paddingHorizontal: espacio.l },
  vacioTitulo: { fontFamily: fuentes.titulo, fontSize: 20, color: colores.tinta, marginTop: espacio.m, marginBottom: espacio.xs },
}));
