import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono from '../../components/Icono';
import { MensajeError } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { listarActividades } from '../../api/actividades';
import { misInscripciones } from '../../api/inscripciones';
import { colores, espacio, estilosDinamicos, fuentes, tituloGrande } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { hora } from '../../utils/formato';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const ALTO_CELDA = 48;

const claveDia = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Calendario (voluntario y coordinador).
 * - Voluntario: las actividades a las que se anotó (pendientes o confirmadas).
 * - Coordinador: todas las actividades de SU organización (la API la toma del token).
 * Cada día con actividad es un círculo del color de su tipo. Al tocarlo aparece un cartelito con
 * el nombre y el horario. Abajo, la próxima actividad.
 */
export default function CalendarioScreen({ navigation }) {
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const esCoord = usuario.rol === 'coordinador';
  const hoy = new Date();
  const [mes, setMes] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [elegido, setElegido] = useState(null); // { clave, fila, col }
  const [anchoGrilla, setAnchoGrilla] = useState(0);

  const inicioMes = mes;
  const finMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59);

  const { datos, error, recargar } = useCarga(async () => {
    if (esCoord) {
      const r = await listarActividades({ mias: true, desde: inicioMes.toISOString(), hasta: finMes.toISOString(), limit: 50 });
      return r.data
        .filter((a) => a.estado !== 'cancelada')
        .map((a) => ({ id: a.id, titulo: a.titulo, fechaInicio: a.fechaInicio, fechaFin: a.fechaFin, tipo: a.tipo, extra: a.cupoIlimitado ? `${a.inscriptos} inscriptos` : `${a.inscriptos}/${a.cupo} inscriptos` }));
    }
    const r = await misInscripciones({ limit: 50 });
    return r.data
      .filter((i) => ['pendiente', 'aceptada'].includes(i.estado) && i.actividad?.fechaInicio)
      .map((i) => ({ id: i.actividadId, titulo: i.actividad.titulo, fechaInicio: i.actividad.fechaInicio, fechaFin: i.actividad.fechaFin, tipo: i.actividad.tipo, extra: i.actividad.organizacion?.nombre || '' }));
  }, [esCoord, mes.getTime()]);

  const eventos = datos || [];
  const porDia = useMemo(() => {
    const m = new Map();
    for (const e of eventos) {
      const k = claveDia(new Date(e.fechaInicio));
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    }
    for (const lista of m.values()) lista.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
    return m;
  }, [eventos]);

  const proxima = useMemo(
    () => eventos.filter((e) => new Date(e.fechaFin) > new Date()).sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))[0],
    [eventos]
  );

  // Grilla de 6 semanas, de lunes a domingo.
  const celdas = useMemo(() => {
    const desplazamiento = (mes.getDay() + 6) % 7; // lunes = 0
    return Array.from({ length: 42 }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), 1 - desplazamiento + i));
  }, [mes]);

  const cambiarMes = (delta) => {
    setElegido(null);
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  };

  const abrir = (e) => {
    setElegido(null);
    if (esCoord) navigation.navigate('GestionActividad', { id: e.id });
    else navigation.navigate('ActividadDetalle', { id: e.id });
  };

  const anchoCelda = anchoGrilla / 7;
  const listaElegida = elegido ? porDia.get(elegido.clave) || [] : [];
  const diasHasta = proxima ? Math.max(0, Math.ceil((new Date(proxima.fechaInicio).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)) : 0;
  const tProxima = estiloTipo(proxima?.tipo);

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ paddingTop: insets.top + espacio.xl, paddingBottom: espacio.xxl }}>
      <View style={styles.relleno}>
        <Text style={styles.ante}>{esCoord ? 'Actividades de tu organización' : 'Tus actividades agendadas'}</Text>
        <Text style={styles.titulo}>Calendario</Text>
        <MensajeError texto={error} onReintentar={recargar} />

        <View style={styles.mesFila}>
          <Text style={styles.mesTexto}>
            {MESES[mes.getMonth()]} <Text style={{ color: colores.coral }}>{mes.getFullYear()}</Text>
          </Text>
          <View style={styles.flechas}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" hitSlop={10} onPress={() => cambiarMes(-1)}>
              <Icono nombre="izquierda" color={colores.coral} tamano={22} grosor={2.4} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" hitSlop={10} onPress={() => cambiarMes(1)}>
              <Icono nombre="derecha" color={colores.coral} tamano={22} grosor={2.4} />
            </Pressable>
          </View>
        </View>

        <View style={styles.semana}>
          {DIAS.map((d, i) => (
            <Text key={i} style={styles.diaSemana}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grilla} onLayout={(e) => setAnchoGrilla(e.nativeEvent.layout.width)}>
          {celdas.map((d, i) => {
            const delMes = d.getMonth() === mes.getMonth();
            const clave = claveDia(d);
            const lista = delMes ? porDia.get(clave) : null;
            const esHoy = claveDia(hoy) === clave;
            const pasado = d < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const fila = Math.floor(i / 7);
            const col = i % 7;
            if (!lista) {
              return (
                <View key={i} style={styles.celda}>
                  <View style={[styles.circulo, esHoy && styles.hoy]}>
                    <Text style={[styles.numero, !delMes && styles.fuera, pasado && delMes && styles.pasado, esHoy && { fontFamily: fuentes.numero }]}>{d.getDate()}</Text>
                  </View>
                </View>
              );
            }
            const a = estiloTipo(lista[0].tipo);
            const b = lista[1] ? estiloTipo(lista[1].tipo) : null;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${d.getDate()} de ${MESES[d.getMonth()]}: ${lista.map((e) => e.titulo).join(', ')}`}
                onPress={() => setElegido(elegido?.clave === clave ? null : { clave, fila, col })}
                style={styles.celda}
              >
                <View style={[styles.circulo, { backgroundColor: a.color, opacity: pasado ? 0.45 : 1, overflow: 'hidden' }]}>
                  {b ? <View style={[styles.mitad, { backgroundColor: b.color }]} /> : null}
                  <Text style={[styles.numero, { color: a.esTipo ? colores.tintaFija : colores.tinta, fontFamily: fuentes.negrita }]}>{d.getDate()}</Text>
                </View>
                {lista.length > 1 ? (
                  <View style={styles.cuantos}>
                    <Text style={styles.cuantosTexto}>{lista.length}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          {elegido && anchoCelda > 0 ? (
            <>
              <Pressable accessibilityLabel="Cerrar" onPress={() => setElegido(null)} style={styles.cerrarCapa} />
              <View
                style={[
                  styles.globo,
                  elegido.fila < 3 ? { top: (elegido.fila + 1) * ALTO_CELDA + 4 } : { bottom: (6 - elegido.fila) * ALTO_CELDA + 4 },
                  { left: Math.max(0, Math.min(anchoGrilla - 240, elegido.col * anchoCelda + anchoCelda / 2 - 120)) },
                ]}
              >
                <Text style={styles.globoFecha}>
                  {(() => {
                    const d = new Date(listaElegida[0]?.fechaInicio);
                    return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3).toLowerCase()}`.toUpperCase();
                  })()}
                </Text>
                {listaElegida.map((e) => (
                  <Pressable key={e.id} accessibilityRole="button" onPress={() => abrir(e)} style={styles.globoFila}>
                    <View style={[styles.globoBarra, { backgroundColor: estiloTipo(e.tipo).color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.globoTitulo} numberOfLines={2}>
                        {e.titulo}
                      </Text>
                      <Text style={styles.globoHora}>
                        {hora(e.fechaInicio)} a {hora(e.fechaFin)}
                        {esCoord && e.extra ? ` · ${e.extra}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>

        {proxima ? (
          <Pressable accessibilityRole="button" onPress={() => abrir(proxima)} style={[styles.proxima, { backgroundColor: tProxima.esTipo ? tProxima.color : colores.sol }]}>
            <View style={styles.proximaBurbuja} />
            <View style={styles.proximaFila}>
              <View style={styles.proximaEtiqueta}>
                <Text style={styles.proximaEtiquetaTexto}>{esCoord ? 'Próxima de tu organización' : 'Tu próxima actividad'}</Text>
              </View>
              <Text style={styles.proximaEn}>{diasHasta === 0 ? 'hoy' : diasHasta === 1 ? 'mañana' : `en ${diasHasta} días`}</Text>
            </View>
            <View style={styles.proximaFila}>
              <View style={{ width: 48, alignItems: 'center' }}>
                <Text style={styles.proximaDia}>{new Date(proxima.fechaInicio).getDate()}</Text>
                <Text style={styles.proximaMes}>{MESES[new Date(proxima.fechaInicio).getMonth()].slice(0, 3).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proximaTitulo} numberOfLines={2}>
                  {proxima.titulo}
                </Text>
                <Text style={styles.proximaLinea} numberOfLines={1}>
                  {hora(proxima.fechaInicio)} a {hora(proxima.fechaFin)}
                  {proxima.extra ? ` · ${proxima.extra}` : ''}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  relleno: { paddingHorizontal: espacio.xl },
  ante: { fontFamily: fuentes.texto, fontSize: 13.5, color: colores.tintaSuave },
  titulo: { ...tituloGrande(42), color: colores.tinta, marginTop: 4, marginBottom: espacio.l },

  mesFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: espacio.m, paddingHorizontal: 4 },
  mesTexto: { fontFamily: fuentes.negrita, fontSize: 19, color: colores.tinta },
  flechas: { flexDirection: 'row', gap: 20 },
  semana: { flexDirection: 'row', marginBottom: 6 },
  diaSemana: { flex: 1, textAlign: 'center', fontFamily: fuentes.negrita, fontSize: 12, color: colores.tintaSuave },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', position: 'relative' },
  celda: { width: `${100 / 7}%`, height: ALTO_CELDA, alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  mitad: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 19 },
  hoy: { borderWidth: 2, borderColor: colores.tinta },
  numero: { fontFamily: fuentes.textoMedio, fontSize: 14, color: colores.tinta },
  fuera: { color: colores.borde },
  pasado: { color: colores.gris },
  cuantos: { position: 'absolute', top: 2, right: '14%', minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colores.tinta, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colores.crema },
  cuantosTexto: { fontFamily: fuentes.negrita, fontSize: 9, color: colores.crema },

  cerrarCapa: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  globo: { position: 'absolute', width: 240, backgroundColor: colores.tarjeta, borderRadius: 18, padding: 10, gap: 4, borderWidth: 1, borderColor: colores.borde, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  globoFecha: { fontFamily: fuentes.negrita, fontSize: 11, color: colores.tintaSuave, paddingHorizontal: 4, paddingBottom: 4, letterSpacing: 0.5 },
  globoFila: { flexDirection: 'row', gap: 10, alignItems: 'stretch', backgroundColor: colores.crema, borderRadius: 12, padding: 8 },
  globoBarra: { width: 6, borderRadius: 3 },
  globoTitulo: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.tinta },
  globoHora: { fontFamily: fuentes.texto, fontSize: 12, color: colores.tintaSuave, marginTop: 2 },

  proxima: { marginTop: espacio.l, borderRadius: 24, padding: 16, gap: 12, overflow: 'hidden' },
  proximaBurbuja: { position: 'absolute', right: -30, bottom: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.28)' },
  proximaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  proximaEtiqueta: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  proximaEtiquetaTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.tintaFija },
  proximaEn: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.tintaFija },
  proximaDia: { fontFamily: fuentes.numero, fontSize: 30, lineHeight: 32, color: colores.tintaFija },
  proximaMes: { fontFamily: fuentes.negrita, fontSize: 11, color: colores.tintaFija },
  proximaTitulo: { fontFamily: fuentes.negrita, fontSize: 16, color: colores.tintaFija },
  proximaLinea: { fontFamily: fuentes.texto, fontSize: 13, color: colores.tintaFija, marginTop: 2 },
}));
