import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BarraProgreso, Cargando, MensajeError, TextoSuave } from '../../components/ui';
import { obtenerQR } from '../../api/asistencias';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes, sombra } from '../../constants/tema';

const RENOVAR_CADA_MS = 50 * 1000; // el QR vence a los 60 s: lo renovamos un poco antes

/** El coordinador muestra este QR y los voluntarios lo escanean para marcar la entrada (2.3). */
export default function MostrarQRScreen({ route }) {
  const { id, titulo } = route.params;
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [segundos, setSegundos] = useState(0);
  const vence = useRef(0);

  const renovar = useCallback(async () => {
    try {
      const r = await obtenerQR(id);
      setQr(r.qr);
      vence.current = new Date(r.expiraEn).getTime();
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [id]);

  useEffect(() => {
    renovar();
    const renovacion = setInterval(renovar, RENOVAR_CADA_MS);
    const reloj = setInterval(() => setSegundos(Math.max(0, Math.round((vence.current - Date.now()) / 1000))), 1000);
    return () => {
      clearInterval(renovacion);
      clearInterval(reloj);
    };
  }, [renovar]);

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>{titulo}</Text>
      <TextoSuave estilo={styles.centrado}>¡Mostrá este código a los voluntarios!</TextoSuave>
      <MensajeError texto={error} onReintentar={renovar} />
      {!qr && !error ? <Cargando /> : null}

      {qr ? (
        <View style={styles.marcoExterior}>
          <View style={styles.anillo} />
          <View style={styles.qr}>
            <QRCode value={qr} size={230} color={colores.tintaFija} />
          </View>
        </View>
      ) : null}

      {qr ? (
        <View style={styles.contador}>
          <Text style={styles.contadorTexto}>Se renueva solo · vence en {segundos} s</Text>
          <BarraProgreso valor={segundos} total={60} color={segundos > 15 ? colores.menta : colores.coral} />
        </View>
      ) : null}
      <TextoSuave estilo={styles.centrado}>
        Los voluntarios aceptados lo escanean desde "Inscripciones". Al terminar, validá cada asistencia en la pantalla anterior.
      </TextoSuave>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema, padding: espacio.l, alignItems: 'center', overflow: 'hidden' },
  titulo: { fontFamily: fuentes.titulo, fontSize: 24, textAlign: 'center', color: colores.tinta },
  marcoExterior: { width: 330, height: 330, alignItems: 'center', justifyContent: 'center', marginVertical: espacio.m },
  anillo: { position: 'absolute', width: 318, height: 318, borderRadius: 159, borderWidth: 3, borderColor: colores.coralSuave },
  qr: { padding: espacio.l, backgroundColor: colores.blanco, borderRadius: 32, borderWidth: 1, borderColor: colores.borde, ...sombra },
  contador: { alignSelf: 'stretch', marginBottom: espacio.m },
  contadorTexto: { fontFamily: fuentes.negrita, color: colores.tinta, textAlign: 'center', marginBottom: 8 },
  centrado: { textAlign: 'center', marginTop: espacio.s },
}));
