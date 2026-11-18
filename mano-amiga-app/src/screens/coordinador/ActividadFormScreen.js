import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Pantalla from '../../components/Pantalla';
import FechaHoraInput from '../../components/FechaHoraInput';
import SelectorUbicacion from '../../components/SelectorUbicacion';
import { hayMapa } from '../../utils/mapa';
import { Boton, BotonPastilla, Campo, Cargando, Chip, MensajeError, Subtitulo, Tarjeta, TextoSuave } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { crearActividad, editarActividad, listarEtiquetas, obtenerActividad } from '../../api/actividades';
import { mensajeDeError } from '../../api/client';
import { espacio } from '../../constants/tema';
import { TIPOS, etiquetaEsTipo } from '../../constants/tipos';

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
    ilimitado: false,
    etiquetas: [],
    contactoMenores: null, // pregunta obligatoria: true / false (null = sin responder)
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
          cupo: a.cupoIlimitado ? '10' : String(a.cupo),
          ilimitado: Boolean(a.cupoIlimitado),
          etiquetas: a.etiquetas.filter(etiquetaEsTipo).slice(0, 1).map((e) => e.id),
          contactoMenores: Boolean(a.contactoMenores),
          fechaInicio: new Date(a.fechaInicio),
          fechaFin: new Date(a.fechaFin),
        })
      )
      .catch((e) => setError(mensajeDeError(e)))
      .finally(() => setCargandoActividad(false));
  }, [id, navigation]);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  // Un solo tipo por actividad: elegir otro reemplaza al anterior.
  const alternarEtiqueta = (eid) => setForm((f) => ({ ...f, etiquetas: f.etiquetas.includes(eid) ? [] : [eid] }));

  const guardar = async () => {
    setError(null);
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const cupo = parseInt(form.cupo, 10);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return setError(hayMapa ? 'Ubicá la actividad en el mapa (buscá la dirección o tocá el lugar).' : 'Tocá "Buscar dirección" para ubicar la actividad.');
    if (!form.ilimitado && (Number.isNaN(cupo) || cupo < 1)) return setError('El cupo debe ser un número mayor a 0 (o elegí "Sin límite")');
    if (form.fechaFin <= form.fechaInicio) return setError('La fecha de fin debe ser posterior a la de inicio');
    if (form.contactoMenores === null) return setError('Respondé si hay contacto con menores.');

    // La organización NO se manda: la API la toma del token del coordinador.
    const datos = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      direccion: form.direccion.trim(),
      ubicacion: { lat, lng },
      cupo: form.ilimitado ? null : cupo, // null = cupos ilimitados
      etiquetas: form.etiquetas,
      contactoMenores: form.contactoMenores,
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
      <Tarjeta>
      <Campo etiqueta="Título" value={form.titulo} onChangeText={set('titulo')} maxLength={100} />
      <Campo etiqueta="Descripción (mínimo 10 caracteres)" value={form.descripcion} onChangeText={set('descripcion')} multiline maxLength={2000} />
      <FechaHoraInput etiqueta="Inicio" valor={form.fechaInicio} onChange={set('fechaInicio')} />
      <FechaHoraInput etiqueta="Fin" valor={form.fechaFin} onChange={set('fechaFin')} />
      <View style={styles.fila}>
        <View style={styles.mitad}>
          {form.ilimitado ? (
            <Campo etiqueta="Cupo" value="Ilimitado" editable={false} />
          ) : (
            <Campo etiqueta="Cupo" value={form.cupo} onChangeText={set('cupo')} keyboardType="number-pad" />
          )}
        </View>
        <View style={styles.sinLimite}>
          <Chip texto="Sin límite" activo={form.ilimitado} onPress={() => setForm((f) => ({ ...f, ilimitado: !f.ilimitado }))} />
        </View>
      </View>
      </Tarjeta>

      <Subtitulo>Ubicación de la actividad</Subtitulo>
      <Tarjeta>
      <SelectorUbicacion valor={form} onChange={(cambios) => setForm((f) => ({ ...f, ...cambios }))} />
      </Tarjeta>

      <Subtitulo>Tipo de actividad</Subtitulo>
      <TextoSuave estilo={{ marginBottom: espacio.s }}>Elegí uno. Define el color y el ícono de la actividad en la app.</TextoSuave>
      {(() => {
        // Los tipos en el orden de la paleta ("Otros" al final), repartidos en dos filas centradas.
        const orden = Object.keys(TIPOS);
        const tipos = (etiquetas.datos || [])
          .filter(etiquetaEsTipo)
          .sort((a, b) => (orden.indexOf(a.nombre) + 1 || 99) - (orden.indexOf(b.nombre) + 1 || 99));
        // Los 8 tipos con color en dos columnas (4 filas); "Otros" va abajo a la izquierda, sin color.
        const otros = tipos.find((e) => e.nombre === 'Otros');
        const conColor = tipos.filter((e) => e.nombre !== 'Otros');
        const filas = [];
        for (let i = 0; i < conColor.length; i += 2) filas.push(conColor.slice(i, i + 2));
        return (
          <>
            {filas.map((fila, i) => (
              <View key={i} style={styles.chipsFila}>
                {fila.map((e) => (
                  <View key={e.id} style={styles.chipCelda}>
                    <Chip texto={e.nombre} clave={e.nombre} suave estilo={styles.chipLleno} activo={form.etiquetas.includes(e.id)} onPress={() => alternarEtiqueta(e.id)} />
                  </View>
                ))}
                {fila.length === 1 ? <View style={styles.chipCelda} /> : null}
              </View>
            ))}
            {otros ? (
              <View style={styles.chipsFila}>
                <View style={styles.chipCelda}>
                  <Chip texto="Otros" clave="sin-color" estilo={styles.chipLleno} activo={form.etiquetas.includes(otros.id)} onPress={() => alternarEtiqueta(otros.id)} />
                </View>
                <View style={styles.chipCelda} />
              </View>
            ) : null}
          </>
        );
      })()}

      <Subtitulo>¿Hay contacto con menores?</Subtitulo>
      <Tarjeta>
        <View style={styles.respuestas}>
          <BotonPastilla titulo="Sí" activo={form.contactoMenores === true} onPress={() => setForm((f) => ({ ...f, contactoMenores: true }))} />
          <BotonPastilla titulo="No" activo={form.contactoMenores === false} onPress={() => setForm((f) => ({ ...f, contactoMenores: false }))} />
        </View>
        <TextoSuave estilo={{ marginTop: espacio.s }}>Es obligatorio responder. Si hay contacto con menores, la actividad no se muestra a voluntarios del programa judicial.</TextoSuave>
      </Tarjeta>

      <Boton titulo={id ? 'Guardar cambios' : 'Publicar actividad'}  onPress={guardar} cargando={enviando} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espacio.s },
  mitad: { flex: 1 },
  sinLimite: { justifyContent: 'center', paddingTop: 10 },
  chipsFila: { flexDirection: 'row', gap: espacio.s, marginBottom: espacio.s },
  chipCelda: { flex: 1 },
  chipLleno: { marginRight: 0, marginBottom: 0, alignItems: 'center', paddingVertical: 10 },
  respuestas: { flexDirection: 'row', gap: espacio.s },
});
