import { Pressable, ScrollView, Text, View } from 'react-native';
import Icono from './Icono';
import ImagenApi from './ImagenApi';
import { colores, estilosDinamicos, fuentes, paletas } from '../constants/tema';
import { estiloTipo } from '../constants/tipos';
import { fechaPastilla } from '../utils/formato';

// La carta de Mi historia es siempre "papel" claro (también en modo oscuro), como una hoja de anuario.
const TINTA = paletas.claro.tinta;
const SUAVE = paletas.claro.tintaSuave;
const LINEA = paletas.claro.borde;

/** Pastilla con el ícono del tipo y la fecha, del color del tipo. */
export function PastillaFecha({ tipo, fecha }) {
  const t = estiloTipo(tipo);
  return (
    <View style={[styles.pastilla, { backgroundColor: t.esTipo ? t.color : paletas.claro.pista }]}>
      <View style={[styles.pastillaIcono, { backgroundColor: t.esTipo ? t.clarito : '#FFFFFF' }]}>
        <Icono nombre={t.icono} color={TINTA} tamano={13} grosor={2.2} />
      </View>
      <Text style={styles.pastillaTexto}>{fechaPastilla(fecha)}</Text>
    </View>
  );
}

/**
 * Contenido de la carta blanca: fecha, nombre de la actividad, lugar, relato, organización y fotos.
 * "onFoto" abre una foto en grande.
 */
export default function CartaHistoria({ actividad, organizacion, relato, fotos = [], onFoto, children }) {
  const t = estiloTipo(actividad?.tipo);
  return (
    <View style={styles.carta}>
      <PastillaFecha tipo={actividad?.tipo} fecha={actividad?.fechaInicio} />
      <Text style={styles.titulo}>{actividad?.titulo}</Text>
      {actividad?.direccion ? (
        <View style={styles.lugar}>
          <Icono nombre="mapa" color={SUAVE} tamano={15} />
          <Text style={styles.lugarTexto}>{actividad.direccion}</Text>
        </View>
      ) : null}
      {relato ? <Text style={styles.relato}>{relato}</Text> : null}
      {children}
      <View style={styles.org}>
        <View style={[styles.orgIcono, { backgroundColor: t.esTipo ? t.clarito : paletas.claro.pista }]}>
          <Icono nombre={t.icono} color={TINTA} tamano={18} />
        </View>
        <Text style={styles.orgTexto}>
          <Text style={{ color: SUAVE }}>Organizó{'\n'}</Text>
          <Text style={styles.orgNombre}>{organizacion?.nombre}</Text>
        </Text>
      </View>
      {fotos.length ? (
        <View style={styles.fotos}>
          <Text style={styles.fotosTitulo}>Tus fotos · {fotos.length}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 22 }} style={{ marginRight: -22 }}>
            {fotos.map((f) => (
              <Pressable key={f} accessibilityRole="imagebutton" accessibilityLabel="Ver foto" onPress={() => onFoto && onFoto(f)}>
                <ImagenApi ruta={f} estilo={styles.miniatura} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  carta: { backgroundColor: '#FFFFFF', borderRadius: 30, padding: 22, shadowColor: '#073B4C', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 5, paddingLeft: 5, paddingRight: 12 },
  pastillaIcono: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pastillaTexto: { fontFamily: fuentes.numero, fontSize: 11.5, letterSpacing: 0.6, color: TINTA },
  titulo: { fontFamily: fuentes.negrita, fontSize: 27, lineHeight: 31, letterSpacing: -0.5, color: TINTA, marginTop: 16 },
  lugar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  lugarTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: 13, color: SUAVE },
  relato: { fontFamily: fuentes.texto, fontSize: 14.5, lineHeight: 22, color: TINTA, marginTop: 14 },
  org: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: LINEA },
  orgIcono: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  orgTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: 13, color: TINTA },
  orgNombre: { fontFamily: fuentes.negrita },
  fotos: { marginTop: 14, paddingTop: 14, borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: LINEA },
  fotosTitulo: { fontFamily: fuentes.negrita, fontSize: 12, color: SUAVE, marginBottom: 8 },
  miniatura: { width: 78, height: 78, borderRadius: 14 },
}));
