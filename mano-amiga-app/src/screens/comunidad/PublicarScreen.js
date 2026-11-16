import { useState } from 'react';
import Pantalla from '../../components/Pantalla';
import { Boton, Campo, MensajeError, Tarjeta, TextoSuave, Titulo } from '../../components/ui';
import { publicar } from '../../api/comunidad';
import { mensajeDeError } from '../../api/client';

/** Nueva novedad de una actividad o campaña. Las novedades son públicas: las lee cualquiera. Solo publica el coordinador. */
export default function PublicarScreen({ route, navigation }) {
  const { proyectoId, titulo } = route.params;
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async () => {
    if (!contenido.trim()) return setError('Escribí el contenido');
    setEnviando(true);
    setError(null);
    try {
      await publicar(proyectoId, { contenido: contenido.trim() });
      navigation.goBack();
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <Titulo>{titulo}</Titulo>
      <MensajeError texto={error} />
      <Tarjeta>
        <Campo etiqueta="¿Qué querés contar?" value={contenido} onChangeText={setContenido} multiline maxLength={2000} placeholder="Ej.: El sábado nos encontramos en la escalera frente al Parque Rodó" />
        <TextoSuave>{contenido.length}/2000 · Es público.</TextoSuave>
        <Boton titulo="Publicar" onPress={enviar} cargando={enviando} estilo={{ marginTop: 12 }} />
      </Tarjeta>
    </Pantalla>
  );
}
