import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Pantalla from '../../components/Pantalla';
import { Boton, Campo, Chip, MensajeError, Tarjeta, TextoSuave, Titulo } from '../../components/ui';
import { publicar } from '../../api/comunidad';
import { mensajeDeError } from '../../api/client';

export default function PublicarScreen({ route, navigation }) {
  const { proyectoId, titulo } = route.params;
  const [tipo, setTipo] = useState('post');
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async () => {
    if (!contenido.trim()) return setError('Escribí el contenido');
    setEnviando(true);
    setError(null);
    try {
      await publicar(proyectoId, { tipo, contenido: contenido.trim() });
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
        <View style={styles.tipos}>
          <Chip texto="Novedad" clave="novedad-azul" activo={tipo === 'post'} onPress={() => setTipo('post')} />
          <Chip texto="Convocatoria express" clave="convocatoria" activo={tipo === 'convocatoria'} onPress={() => setTipo('convocatoria')} />
        </View>
        <Campo
          etiqueta="¿Qué querés contar?"
          value={contenido}
          onChangeText={setContenido}
          multiline
          maxLength={2000}
          placeholder={tipo === 'convocatoria' ? '¡Necesitamos 3 personas más para el sábado!' : 'Gracias a todos los que vinieron hoy'}
        />
        <TextoSuave>{contenido.length}/2000 · Es público: no incluyas datos personales de voluntarios.</TextoSuave>
        <Boton titulo="Publicar" onPress={enviar} cargando={enviando} estilo={{ marginTop: 12 }} />
      </Tarjeta>
    </Pantalla>
  );
}

const styles = StyleSheet.create({ tipos: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 } });
