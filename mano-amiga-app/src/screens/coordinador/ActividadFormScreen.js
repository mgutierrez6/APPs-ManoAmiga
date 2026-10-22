import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Pantalla from '../../components/Pantalla';
import FechaHoraInput from '../../components/FechaHoraInput';
import { Boton, Campo, Cargando, Chip, MensajeError, Subtitulo, Tarjeta, TextoSuave } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { crearActividad, editarActividad, listarEtiquetas, obtenerActividad } from '../../api/actividades';
import { mensajeDeError } from '../../api/client';
import { espacio } from '../../constants/tema';

/** Alta y edición de actividades (R2). Si llega route.params.id, es edición. */
export default function ActividadFormScreen({ route, navigation }) {
  const id = route.params?.id;
  const etiquetas = useCarga(() => listarEtiquetas(), []);
  const [cargandoActividad, setCargandoActividad] = useState(Boolean(id));
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    direccion: '',
    lat: '',
    lng: '',
    cupo: '10',
    etiquetas: [],
    fechaInicio: new Date(Date.now() + 86400000),
    fechaFin: new Date(Date.now() + 86400000 + 3 * 3600000),
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar actividad' : 'Nueva actividad' });
    if (!id) return;
    obtenerActividad(id)
      .then((a) =>
        setForm({
          titulo: a.titulo,
          descripcion: a.descripcion,
          direccion: a.direccion,
          lat: String(a.ubicacion.lat),
          lng: String(a.ubicacion.lng),
          cupo: String(a.cupo),
          etiquetas: a.etiquetas.map((e) => e.id),
          fechaInicio: new Date(a.fechaInicio),
          fechaFin: new Date(a.fechaFin),
        })
      )
      .catch((e) => setError(mensajeDeError(e)))
      .finally(() => setCargandoActividad(false));
  }, [id, navigation]);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const alternarEtiqueta = (eid) =>
    setForm((f) => ({ ...f, etiquetas: f.etiquetas.includes(eid) ? f.etiquetas.filter((x) => x !== eid) : [...f.etiquetas, eid] }));

  const guardar = async () => {
    setError(null);
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const cupo = parseInt(form.cupo, 10);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return setError('Completá latitud y longitud (copialas de Google Maps)');
    if (Number.isNaN(cupo) || cupo < 1) return setError('El cupo debe ser un número mayor a 0');
    if (form.fechaFin <= form.fechaInicio) return setError('La fecha de fin debe ser posterior a la de inicio');

    // La organización NO se manda: la API la toma del token del coordinador.
    const datos = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      direccion: form.direccion.trim(),
      ubicacion: { lat, lng },
      cupo,
      etiquetas: form.etiquetas,
      fechaInicio: form.fechaInicio.toISOString(),
      fechaFin: form.fechaFin.toISOString(),
    };
    setEnviando(true);
    try {
      if (id) await editarActividad(id, datos);
      else await crearActividad(datos);
      navigation.goBack();
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  if (cargandoActividad) return <Cargando />;

  return (
    <Pantalla>
      <MensajeError texto={error} />
      <Subtitulo estilo={{ marginTop: 0 }}>Lo básico</Subtitulo>
      <Tarjeta>
      <Campo etiqueta="Título" value={form.titulo} onChangeText={set('titulo')} maxLength={100} />
      <Campo etiqueta="Descripción (mínimo 10 caracteres)" value={form.descripcion} onChangeText={set('descripcion')} multiline maxLength={2000} />
      <FechaHoraInput etiqueta="Inicio" valor={form.fechaInicio} onChange={set('fechaInicio')} />
      <FechaHoraInput etiqueta="Fin" valor={form.fechaFin} onChange={set('fechaFin')} />
      <Campo etiqueta="Cupo" value={form.cupo} onChangeText={set('cupo')} keyboardType="number-pad" />
      </Tarjeta>

      <Subtitulo>Ubicación de la actividad</Subtitulo>
      <Tarjeta>
      <TextoSuave estilo={{ marginBottom: espacio.s }}>
        Es una ubicación institucional y pública (RS7). En Google Maps mantené apretado el lugar y copiá los dos números.
      </TextoSuave>
      <Campo etiqueta="Dirección" value={form.direccion} onChangeText={set('direccion')} />
      <View style={styles.fila}>
        <View style={styles.mitad}>
          <Campo etiqueta="Latitud" value={form.lat} onChangeText={set('lat')} keyboardType="numbers-and-punctuation" placeholder="-34.91" />
        </View>
        <View style={styles.mitad}>
          <Campo etiqueta="Longitud" value={form.lng} onChangeText={set('lng')} keyboardType="numbers-and-punctuation" placeholder="-56.17" />
        </View>
      </View>
      </Tarjeta>

      <Subtitulo>Etiquetas</Subtitulo>
      <View style={styles.chips}>
        {(etiquetas.datos || []).map((e) => (
          <Chip
            key={e.id}
            texto={e.sensible ? `${e.nombre} (sensible)` : e.nombre}
            clave={e.nombre}
            activo={form.etiquetas.includes(e.id)}
            onPress={() => alternarEtiqueta(e.id)}
          />
        ))}
      </View>
      <TextoSuave estilo={{ marginBottom: espacio.m }}>"Sensible" = etiqueta sensible: la actividad no se muestra a voluntarios del programa judicial.</TextoSuave>

      <Boton titulo={id ? 'Guardar cambios' : 'Publicar actividad'}  onPress={guardar} cargando={enviando} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espacio.s },
  mitad: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
