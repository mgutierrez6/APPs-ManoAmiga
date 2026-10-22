import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Pantalla from '../../components/Pantalla';
import FechaHoraInput from '../../components/FechaHoraInput';
import { Boton, Campo, MensajeError, Subtitulo, Tarjeta, TextoSuave } from '../../components/ui';
import { crearCampana } from '../../api/comunidad';
import { mensajeDeError } from '../../api/client';
import { espacio } from '../../constants/tema';

const puntoVacio = () => ({ nombre: '', direccion: '', lat: '', lng: '' });

export default function CrearCampanaScreen({ navigation }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [inicio, setInicio] = useState(new Date());
  const [fin, setFin] = useState(new Date(Date.now() + 14 * 86400000));
  const [puntos, setPuntos] = useState([puntoVacio()]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const setPunto = (i, campo, valor) => setPuntos((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  const enviar = async () => {
    setError(null);
    const puntosValidos = puntos.filter((p) => p.nombre.trim());
    for (const p of puntosValidos) {
      if (Number.isNaN(parseFloat(p.lat)) || Number.isNaN(parseFloat(p.lng))) return setError(`Completá latitud y longitud de "${p.nombre}"`);
    }
    setEnviando(true);
    try {
      await crearCampana({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        objetivo: objetivo.trim(),
        fechaInicio: inicio.toISOString(),
        fechaFin: fin.toISOString(),
        puntos: puntosValidos.map((p) => ({
          nombre: p.nombre.trim(),
          direccion: p.direccion.trim(),
          ubicacion: { lat: parseFloat(p.lat), lng: parseFloat(p.lng) },
        })),
      });
      navigation.goBack();
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <MensajeError texto={error} />
      <Subtitulo estilo={{ marginTop: 0 }}>La campaña</Subtitulo>
      <Tarjeta>
      <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} maxLength={100} />
      <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} multiline maxLength={2000} />
      <Campo etiqueta="Objetivo (ej: 200 prendas de abrigo)" value={objetivo} onChangeText={setObjetivo} maxLength={300} />
      <FechaHoraInput etiqueta="Inicio" valor={inicio} onChange={setInicio} />
      <FechaHoraInput etiqueta="Fin" valor={fin} onChange={setFin} />
      </Tarjeta>

      <Subtitulo>Puntos de acopio</Subtitulo>
      <TextoSuave estilo={{ marginBottom: espacio.s }}>
        Solo ubicaciones institucionales (sede, parroquia, club…). Las coordenadas se copian de Google Maps (mantené apretado el lugar).
      </TextoSuave>
      {puntos.map((p, i) => (
        <Tarjeta key={i}>
          <Campo etiqueta="Nombre del punto" value={p.nombre} onChangeText={(v) => setPunto(i, 'nombre', v)} />
          <Campo etiqueta="Dirección" value={p.direccion} onChangeText={(v) => setPunto(i, 'direccion', v)} />
          <View style={styles.fila}>
            <View style={styles.mitad}>
              <Campo etiqueta="Latitud" value={p.lat} onChangeText={(v) => setPunto(i, 'lat', v)} keyboardType="numbers-and-punctuation" placeholder="-34.90" />
            </View>
            <View style={styles.mitad}>
              <Campo etiqueta="Longitud" value={p.lng} onChangeText={(v) => setPunto(i, 'lng', v)} keyboardType="numbers-and-punctuation" placeholder="-56.18" />
            </View>
          </View>
        </Tarjeta>
      ))}
       <Boton titulo="Agregar otro punto" variante="borde" onPress={() => setPuntos((ps) => [...ps, puntoVacio()])} />
      <Boton titulo="Publicar campaña" onPress={enviar} cargando={enviando} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espacio.s },
  mitad: { flex: 1 },
});
