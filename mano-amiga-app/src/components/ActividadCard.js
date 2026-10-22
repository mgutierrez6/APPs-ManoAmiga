import { StyleSheet, Text, View } from 'react-native';
import { Aparecer, BarraProgreso, Chip, EstadoBadge, Tarjeta } from './ui';
import { colores, espacio, estilosDinamicos, familiaPara, fuentes } from '../constants/tema';
import { diaMes, hora } from '../utils/formato';

/**
 * Tarjeta de actividad: "calendario" con tinte de color a la izquierda, barra de cupos y etiquetas de colores. Entra con una animación según su posición en la lista.
 */
export default function ActividadCard({ actividad, onPress, mostrarEstado = false, indice = 0 }) {
  const f = familiaPara(actividad.id);
  const { dia, mes } = diaMes(actividad.fechaInicio);
  const ocupados = actividad.cupo - actividad.cuposLibres;
  const pocos = actividad.cuposLibres > 0 && actividad.cuposLibres <= 3;

  return (
    <Aparecer indice={indice}>
      <Tarjeta onPress={onPress} estilo={styles.tarjeta}>
        <View style={styles.fila}>
          <View style={[styles.calendario, { backgroundColor: f.base }]}>
            <Text style={[styles.dia, { color: f.texto }]}>{dia}</Text>
            <Text style={[styles.mes, { color: f.texto }]}>{mes}</Text>
          </View>

          <View style={styles.cuerpo}>
            <Text style={styles.titulo} numberOfLines={2}>
              {actividad.titulo}
            </Text>
            <Text style={styles.linea} numberOfLines={1}>
              {actividad.organizacion?.nombre}
            </Text>
            <Text style={styles.linea} numberOfLines={1}>
              {hora(actividad.fechaInicio)} a {hora(actividad.fechaFin)}
              {actividad.direccion ? `, ${actividad.direccion}` : ''}
            </Text>
            {mostrarEstado ? (
              <View style={{ marginTop: 6 }}>
                <EstadoBadge estado={actividad.estado} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cupos}>
          <View style={styles.cuposTexto}>
            <Text style={[styles.cuposLibres, pocos && { color: colores.coralTexto }]}>
              {actividad.cuposLibres === 0 ? 'Cupo completo' : pocos ? `Quedan ${actividad.cuposLibres}` : `${actividad.cuposLibres} lugares libres`}
            </Text>
            <Text style={styles.cuposTotal}>
              {ocupados}/{actividad.cupo}
            </Text>
          </View>
          <BarraProgreso valor={ocupados} total={actividad.cupo} color={pocos || actividad.cuposLibres === 0 ? colores.coral : colores.menta} />
        </View>

        {actividad.etiquetas?.length ? (
          <View style={styles.etiquetas}>
            {actividad.etiquetas.map((e) => (
              <Chip key={e.id} texto={e.nombre} clave={e.nombre} />
            ))}
          </View>
        ) : null}
      </Tarjeta>
    </Aparecer>
  );
}

const styles = estilosDinamicos(() => ({
  tarjeta: { padding: espacio.m },
  fila: { flexDirection: 'row' },
  calendario: { width: 58, height: 66, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: espacio.m },
  dia: { fontFamily: fuentes.titulo, fontSize: 26, lineHeight: 28 },
  mes: { fontFamily: fuentes.negrita, fontSize: 12, letterSpacing: 1 },
  cuerpo: { flex: 1 },
  titulo: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta, marginBottom: 2 },
  linea: { fontFamily: fuentes.texto, color: colores.tintaSuave, fontSize: 13, marginTop: 2 },
  cupos: { marginTop: espacio.m },
  cuposTexto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cuposLibres: { fontFamily: fuentes.negrita, color: colores.mentaTexto, fontSize: 13 },
  cuposTotal: { fontFamily: fuentes.textoMedio, color: colores.gris, fontSize: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', marginTop: espacio.m },
}));
