import { Pressable, Text, View } from 'react-native';
import { Aparecer, EstadoBadge } from './ui';
import { colores, espacio, estilosDinamicos, fuentes } from '../constants/tema';
import { estiloTipo, tipoDe } from '../constants/tipos';
import { diaMes, hora } from '../utils/formato';

/** Texto de los lugares: "Cupos ilimitados", "Completo", "Quedan 2" o "12 lugares". */
export function textoCupos(a) {
  if (a.cupoIlimitado || a.cuposLibres == null) return { texto: 'Cupos ilimitados', pocos: false };
  if (a.cuposLibres === 0) return { texto: 'Completo', pocos: false };
  if (a.cuposLibres <= 3) return { texto: `Quedan ${a.cuposLibres}`, pocos: true };
  return { texto: `${a.cuposLibres} lugares`, pocos: false };
}

/**
 * Fila de actividad: la fecha en un cuadradito del color de su TIPO y, al lado, título y horario.
 * Así todas las actividades de un mismo tipo se ven del mismo color (igual que en el mapa y el calendario).
 */
export default function ActividadCard({ actividad, onPress, mostrarEstado = false, indice = 0 }) {
  const t = estiloTipo(tipoDe(actividad));
  const { dia, mes } = diaMes(actividad.fechaInicio);
  const cupos = textoCupos(actividad);
  return (
    <Aparecer indice={indice}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.fila, pressed && { opacity: 0.7 }]}>
        <View style={[styles.fecha, { backgroundColor: t.color }]}>
          <Text style={[styles.dia, { color: t.texto }]}>{dia}</Text>
          <Text style={[styles.mes, { color: t.texto }]}>{mes}</Text>
        </View>
        <View style={styles.cuerpo}>
          <Text style={styles.titulo} numberOfLines={2}>
            {actividad.titulo}
          </Text>
          <Text style={styles.linea} numberOfLines={1}>
            {hora(actividad.fechaInicio)} a {hora(actividad.fechaFin)}
            {actividad.organizacion?.nombre ? ` · ${actividad.organizacion.nombre}` : ''}
          </Text>
          {mostrarEstado ? (
            <View style={{ marginTop: 6 }}>
              <EstadoBadge estado={actividad.estado} />
            </View>
          ) : null}
        </View>
        {cupos.pocos ? (
          <View style={styles.pocos}>
            <Text style={styles.pocosTexto}>{cupos.texto}</Text>
          </View>
        ) : (
          <Text style={styles.cupos}>{cupos.texto}</Text>
        )}
      </Pressable>
    </Aparecer>
  );
}

const styles = estilosDinamicos(() => ({
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: espacio.m, borderBottomWidth: 1, borderBottomColor: colores.linea },
  fecha: { width: 50, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: espacio.m },
  dia: { fontFamily: fuentes.numero, fontSize: 20, lineHeight: 22 },
  mes: { fontFamily: fuentes.negrita, fontSize: 10.5 },
  cuerpo: { flex: 1, marginRight: espacio.s },
  titulo: { fontFamily: fuentes.negrita, fontSize: 15.5, color: colores.tinta },
  linea: { fontFamily: fuentes.texto, color: colores.tintaSuave, fontSize: 13, marginTop: 2 },
  cupos: { fontFamily: fuentes.textoMedio, color: colores.tintaSuave, fontSize: 12, maxWidth: 80, textAlign: 'right' },
  pocos: { backgroundColor: colores.coralSuave, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pocosTexto: { fontFamily: fuentes.negrita, color: colores.coralTexto, fontSize: 11.5 },
}));
