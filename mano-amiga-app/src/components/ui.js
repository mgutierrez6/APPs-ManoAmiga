import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, Text, TextInput, View } from 'react-native';
import { colores, espacio, estilosDinamicos, estilosEstado, familiaPara, fuentes, radio, sombra, tituloGrande } from '../constants/tema';
import { esTipo, estiloTipo } from '../constants/tipos';
import { estadoTexto } from '../utils/formato';
import { LogoMarca } from './Logo';
import ImagenApi from './ImagenApi';
import Icono from './Icono';

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

/** Título grande con la letra de la marca (Pearl Jean). */
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
/* Botón plano: color sólido, se achica apenas al tocarlo              */
/* ------------------------------------------------------------------ */

const VARIANTES = estilosDinamicos(() => ({
  primario: { fondo: colores.coral, sombra: colores.coralOscuro, texto: colores.blanco },
  secundario: { fondo: colores.oceano, sombra: colores.oceanoOscuro, texto: colores.blanco },
  exito: { fondo: colores.menta, sombra: colores.mentaOscuro, texto: colores.tintaFija },
  sol: { fondo: colores.sol, sombra: colores.solOscuro, texto: colores.tintaFija },
  lila: { fondo: colores.lila, sombra: colores.lilaOscuro, texto: colores.tintaFija },
  tinta: { fondo: colores.tinta, sombra: colores.tintaSuave, texto: colores.crema },
  peligro: { fondo: colores.peligro, sombra: '#A3173A', texto: colores.blanco },
  borde: { fondo: colores.tarjeta, sombra: colores.borde, texto: colores.tinta, borde: colores.tinta },
}));

export function Boton({ titulo, onPress, variante = 'primario', cargando = false, deshabilitado = false, estilo, chico = false, icono }) {
  const v = VARIANTES[variante] || VARIANTES.primario;
  const escala = useRef(new Animated.Value(1)).current;
  const inactivo = deshabilitado || cargando;

  const animar = (a) => Animated.spring(escala, { toValue: a, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, styles.botonContenedor, estilo]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactivo }}
        onPress={onPress}
        disabled={inactivo}
        onPressIn={() => animar(0.98)}
        onPressOut={() => animar(1)}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.boton,
              chico && styles.botonChico,
              { backgroundColor: pressed && !v.borde ? v.sombra : v.fondo, opacity: inactivo ? 0.5 : 1 },
              v.borde && { borderWidth: 1.5, borderColor: colores.borde },
            ]}
          >
            {cargando ? (
              <ActivityIndicator color={v.texto} />
            ) : (
              <View style={styles.botonFila}>
                {icono ? <Icono nombre={icono} color={v.texto} tamano={chico ? 16 : 19} grosor={2.2} /> : null}
                <Text style={[styles.botonTexto, chico && styles.botonTextoChico, { color: v.texto }]}>{titulo}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Botón chico redondeado (tipo "pastilla"). activo = relleno azul oscuro. */
export function BotonPastilla({ titulo, onPress, activo = false, primario = false, icono }) {
  const fondo = primario ? colores.coral : activo ? colores.tinta : colores.tarjeta;
  const texto = primario ? colores.blanco : activo ? colores.crema : colores.tinta;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={({ pressed }) => [styles.pastillaBoton, { backgroundColor: fondo }, !primario && !activo && styles.pastillaBorde, pressed && { opacity: 0.75 }]}
    >
      {icono ? <Icono nombre={icono} color={texto} tamano={15} grosor={2.3} /> : null}
      <Text style={[styles.pastillaBotonTexto, { color: texto }]}>{titulo}</Text>
    </Pressable>
  );
}

/** Control segmentado (ej.: Próximas / Pasadas). */
export function Segmentos({ opciones, valor, onChange, estilo }) {
  return (
    <View style={[styles.segmentos, estilo]}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            onPress={() => onChange(o.valor)}
            style={[styles.segmento, activo && { backgroundColor: colores.tinta }]}
          >
            <Text style={[styles.segmentoTexto, activo && { color: colores.crema, fontFamily: fuentes.negrita }]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
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

/** Tarjeta redondeada. "acento" pinta una franja de color a la izquierda. */
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

/** Aparece con un deslizamiento corto y suave (para listas y tarjetas). */
export function Aparecer({ children, indice = 0, estilo }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay: Math.min(indice, 8) * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, indice]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return <Animated.View style={[estilo, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/* ------------------------------------------------------------------ */
/* Chips, estados, avatar, progreso                                    */
/* ------------------------------------------------------------------ */

/**
 * Chip redondeado. Si "clave" (o el texto) es un tipo de actividad, se pinta con el color del tipo.
 * El chip elegido se pinta de azul oscuro, así se distingue sin depender solo del color.
 */
export function Chip({ texto, activo = false, onPress, clave, suave = false, estilo }) {
  const nombre = clave ?? texto;
  const t = esTipo(nombre) ? estiloTipo(nombre) : null;
  // "suave": el tipo se muestra en su color clarito y, al elegirlo, en su color pleno con borde (sin pasar a azul).
  if (suave && t) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityState={onPress ? { selected: activo } : undefined}
        style={({ pressed }) => [styles.chip, { backgroundColor: activo ? t.color : t.clarito, borderWidth: 2, borderColor: activo ? colores.tintaFija : 'transparent', paddingVertical: 6 }, estilo, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.chipTexto, { color: colores.tintaFija }, activo && { fontFamily: fuentes.negrita }]}>{texto}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityState={onPress ? { selected: activo } : undefined}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: activo ? colores.tinta : t ? t.color : colores.tarjeta },
        !activo && !t && styles.chipBorde,
        estilo,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipTexto, { color: activo ? colores.crema : t ? colores.tintaFija : colores.tinta }]}>{texto}</Text>
    </Pressable>
  );
}

export function EstadoBadge({ estado }) {
  const e = estilosEstado[estado] || { fondo: colores.neutroSuave, texto: colores.tintaSuave };
  return (
    <View style={[styles.badge, { backgroundColor: e.fondo }]}>
      <Text style={[styles.badgeTexto, { color: e.texto }]}>{estadoTexto[estado] || estado}</Text>
    </View>
  );
}

/** Círculo con la foto de la persona o, si no tiene, sus iniciales. */
export function Avatar({ nombre = '', apellido = '', tamano = 44, foto }) {
  const iniciales = `${(nombre[0] || '').toUpperCase()}${(apellido[0] || '').toUpperCase()}` || '?';
  const redondo = { width: tamano, height: tamano, borderRadius: tamano / 2 };
  if (foto) return <ImagenApi ruta={foto} estilo={redondo} />;
  return (
    <View style={[styles.avatar, redondo, { backgroundColor: colores.sol }]}>
      <Text style={[styles.avatarTexto, { fontSize: tamano * 0.36 }]}>{iniciales}</Text>
    </View>
  );
}

export function BarraProgreso({ valor = 0, total = 1, color = colores.menta, fondo }) {
  const pct = Math.max(0, Math.min(1, total ? valor / total : 0));
  const ancho = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ancho, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [ancho, pct]);
  return (
    <View style={[styles.barra, fondo && { backgroundColor: fondo }]}>
      <Animated.View style={[styles.barraRelleno, { backgroundColor: color, width: ancho.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

/** Pastilla de información: texto sobre un tinte de color. */
export function Pastilla({ texto, clave, estilo }) {
  const f = familiaPara(clave ?? texto);
  return (
    <View style={[styles.pastilla, { backgroundColor: f.suave }, estilo]}>
      <Text style={styles.pastillaTexto}>{texto}</Text>
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
            style={[styles.punto, { backgroundColor: tonos[i], transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}
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
  titulo: { ...tituloGrande(30), color: colores.tinta, marginBottom: espacio.xs },
  subtitulo: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta, marginTop: espacio.l, marginBottom: espacio.s, letterSpacing: -0.2 },
  textoSuave: { fontFamily: fuentes.texto, color: colores.tintaSuave, fontSize: 14, lineHeight: 20 },

  botonContenedor: { marginVertical: 5 },
  boton: { minHeight: 52, paddingHorizontal: espacio.xl, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  botonChico: { minHeight: 40, paddingHorizontal: espacio.l, borderRadius: 999 },
  botonFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonTexto: { fontFamily: fuentes.negrita, fontSize: 15.5 },
  botonTextoChico: { fontSize: 14 },

  pastillaBoton: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 13, borderRadius: 999 },
  pastillaBorde: { borderWidth: 1.5, borderColor: colores.borde },
  pastillaBotonTexto: { fontFamily: fuentes.negrita, fontSize: 13 },

  segmentos: { flexDirection: 'row', gap: 4, backgroundColor: colores.pista, borderRadius: 999, padding: 4 },
  segmento: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentoTexto: { fontFamily: fuentes.textoMedio, fontSize: 14, color: colores.tintaSuave },

  campo: { marginBottom: espacio.m },
  etiqueta: { fontFamily: fuentes.semi, fontSize: 13, color: colores.tintaSuave, marginBottom: 6, marginLeft: 2 },
  inputCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colores.borde,
    borderRadius: 16,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: espacio.m,
  },
  inputFoco: { borderColor: colores.coral, backgroundColor: colores.campoFoco },
  inputError: { borderColor: colores.peligro },
  inputMultilinea: { alignItems: 'flex-start', paddingTop: 4 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15.5, color: colores.tinta, fontFamily: fuentes.texto },
  textoError: { fontFamily: fuentes.textoMedio, color: colores.peligro, marginTop: espacio.xs, marginLeft: 4 },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radio, padding: espacio.l, marginBottom: espacio.m, ...sombra },
  tarjetaConAcento: { paddingLeft: espacio.l + 6, overflow: 'hidden' },
  tarjetaPresionada: { opacity: 0.75 },
  acento: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },

  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: espacio.s, marginBottom: espacio.s },
  chipBorde: { borderWidth: 1.5, borderColor: colores.borde, paddingVertical: 6.5 },
  chipTexto: { fontFamily: fuentes.semi, fontSize: 13 },

  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  badgeTexto: { fontFamily: fuentes.negrita, fontSize: 11.5 },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fuentes.numero, color: colores.tintaFija },

  barra: { height: 8, borderRadius: 999, backgroundColor: colores.pista, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 999 },

  pastilla: { flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 8, marginBottom: 8 },
  pastillaTexto: { fontFamily: fuentes.textoMedio, fontSize: 13, color: colores.tinta },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, minHeight: 160 },
  fila: { flexDirection: 'row', gap: 8 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  error: { backgroundColor: colores.coralSuave, padding: espacio.m, borderRadius: 16, marginBottom: espacio.m },
  errorTexto: { fontFamily: fuentes.textoMedio, color: colores.coralTexto, marginBottom: espacio.xs },
  vacio: { alignItems: 'center', paddingVertical: espacio.xl, paddingHorizontal: espacio.l },
  vacioTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta, marginTop: espacio.m, marginBottom: espacio.xs },
}));
