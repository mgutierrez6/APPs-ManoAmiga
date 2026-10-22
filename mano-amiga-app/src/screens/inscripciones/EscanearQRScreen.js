import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Boton, Cargando, TextoSuave } from '../../components/ui';
import Icono from '../../components/Icono';
import { registrarAsistenciaQR } from '../../api/asistencias';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';

/**
 * El voluntario escanea el QR que muestra el coordinador (2.3).
 * El QR es un código firmado por el servidor que vence a los 60 s: la app solo lo reenvía,
 * la validación la hace la API.
 */
export default function EscanearQRScreen({ route, navigation }) {
  const { actividadId, titulo } = route.params;
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [estado, setEstado] = useState('escaneando'); // escaneando | enviando | ok | error
  const [mensaje, setMensaje] = useState('');
  const bloqueado = useRef(false); // evita mandar el mismo QR varias veces

  const alEscanear = async ({ data }) => {
    if (bloqueado.current) return;
    bloqueado.current = true;
    setEstado('enviando');
    try {
      await registrarAsistenciaQR(actividadId, data);
      setEstado('ok');
      setMensaje('El coordinador la va a validar al terminar la actividad.');
    } catch (e) {
      setEstado('error');
      setMensaje(mensajeDeError(e));
    }
  };

  const reintentar = () => {
    bloqueado.current = false;
    setEstado('escaneando');
    setMensaje('');
  };

  if (!permiso) return <Cargando />;
  if (!permiso.granted) {
    return (
      <View style={styles.centro}>
        <Icono nombre="qr" color={colores.tintaSuave} tamano={56} grosor={1.6} />
        <Text style={styles.texto}>Necesitamos la cámara para escanear el código QR de asistencia.</Text>
        <Boton titulo="Permitir cámara" onPress={pedirPermiso} />
      </View>
    );
  }

  if (estado === 'ok') {
    return (
      <View style={styles.centro}>
        <View style={styles.okCirculo}>
          <Icono nombre="check" color={colores.mentaTexto} tamano={56} grosor={2.4} />
        </View>
        <Text style={styles.exito}>¡Asistencia registrada!</Text>
        <Text style={styles.texto}>{mensaje}</Text>
        <Boton titulo="Volver" variante="secundario" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>{titulo}</Text>
      <View style={styles.marcoExterior}>
        <View style={styles.anillo} />
        <View style={styles.camaraMarco}>
          {estado !== 'error' ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={estado === 'escaneando' ? alEscanear : undefined}
            />
          ) : null}
        </View>
      </View>
      {estado === 'enviando' ? <TextoSuave estilo={styles.centrado}>Registrando…</TextoSuave> : null}
      {estado === 'escaneando' ? <TextoSuave estilo={styles.centrado}>Apuntá al código QR que muestra el coordinador</TextoSuave> : null}
      {estado === 'error' ? (
        <View style={styles.resultado}>
          <Text style={[styles.texto, { color: colores.peligro }]}>{mensaje}</Text>
          <Boton titulo="Escanear de nuevo" onPress={reintentar} />
          <Boton titulo="Volver" variante="borde" onPress={() => navigation.goBack()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema, padding: espacio.l, alignItems: 'center' },
  titulo: { fontFamily: fuentes.titulo, fontSize: 22, marginBottom: espacio.l, color: colores.tinta, textAlign: 'center' },
  marcoExterior: { width: 320, height: 320, alignItems: 'center', justifyContent: 'center' },
  anillo: { position: 'absolute', width: 310, height: 310, borderRadius: 52, borderWidth: 3, borderColor: colores.coralSuave },
  camaraMarco: { width: 272, height: 272, borderRadius: 40, overflow: 'hidden', backgroundColor: colores.tintaFija },
  centrado: { textAlign: 'center', marginTop: espacio.l },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'stretch', padding: espacio.xl, backgroundColor: colores.crema },
  okCirculo: { alignSelf: 'center', width: 112, height: 112, borderRadius: 56, backgroundColor: colores.mentaSuave, alignItems: 'center', justifyContent: 'center', marginBottom: espacio.l },
  exito: { fontFamily: fuentes.titulo, fontSize: 28, color: colores.mentaOscuro, textAlign: 'center', marginBottom: espacio.s },
  texto: { fontFamily: fuentes.textoMedio, fontSize: 16, textAlign: 'center', marginBottom: espacio.m, color: colores.tinta },
  resultado: { marginTop: espacio.l, alignSelf: 'stretch' },
}));
