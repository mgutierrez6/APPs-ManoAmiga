import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Pantalla from '../../components/Pantalla';
import { Aparecer, BarraProgreso, Boton, Cargando, Chip, MensajeError, Pastilla, Tarjeta } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { obtenerActividad } from '../../api/actividades';
import { inscribirme } from '../../api/inscripciones';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, familiaPara, fuentes } from '../../constants/tema';
import { rangoFechas } from '../../utils/formato';

export default function ActividadDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const { usuario } = useAuth();
  const { datos: act, cargando, error, recargar } = useCarga(() => obtenerActividad(id), [id]);
  const [enviando, setEnviando] = useState(false);

  const inscribir = async () => {
    setEnviando(true);
    try {
      await inscribirme(id);
      Alert.alert('¡Genial!', 'Te inscribiste. El coordinador tiene que aceptar tu inscripción; lo vas a ver en "Inscripciones".');
      recargar();
    } catch (e) {
      Alert.alert('No se pudo inscribir', mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  if (cargando && !act) return <Cargando />;
  if (error) return <MensajeError texto={error} onReintentar={recargar} />;
  if (!act) return null;

  const f = familiaPara(act.id);
  const ocupados = act.cupo - act.cuposLibres;

  return (
    <Pantalla>
      <Aparecer>
        <View style={[styles.portada, { backgroundColor: f.base }]}>
          <Text style={[styles.titulo, { color: f.texto }]}>{act.titulo}</Text>
          <Text style={[styles.org, { color: f.texto }]}>{act.organizacion?.nombre}</Text>
        </View>
      </Aparecer>

      <Aparecer indice={1}>
        <View style={styles.pastillas}>
          <Pastilla texto={rangoFechas(act.fechaInicio, act.fechaFin)} clave="fecha" />
          {act.direccion ? <Pastilla texto={act.direccion} clave="lugar" /> : null}
        </View>
      </Aparecer>

      <Aparecer indice={2}>
        <Tarjeta>
          <View style={styles.cuposFila}>
            <Text style={styles.cuposTitulo}>Lugares</Text>
            <Text style={styles.cuposNumero}>
              {act.cuposLibres} libres de {act.cupo}
            </Text>
          </View>
          <BarraProgreso valor={ocupados} total={act.cupo} color={act.cuposLibres <= 3 ? colores.coral : colores.menta} />
        </Tarjeta>
      </Aparecer>

      <Aparecer indice={3}>
        <Tarjeta acento={f.base}>
          <Text style={styles.seccion}>De qué se trata</Text>
          <Text style={styles.descripcion}>{act.descripcion}</Text>
          <View style={styles.etiquetas}>
            {act.etiquetas.map((e) => (
              <Chip key={e.id} texto={e.nombre} clave={e.nombre} />
            ))}
          </View>
        </Tarjeta>
      </Aparecer>

      {usuario.rol === 'voluntario' ? (
        <Boton
          titulo={act.cuposLibres > 0 ? '¡Me sumo!' : 'Sin cupos'}
          
          onPress={inscribir}
          cargando={enviando}
          deshabilitado={act.cuposLibres === 0}
        />
      ) : null}
      <Boton
        titulo="Ver la comunidad"
       
        variante="secundario"
        onPress={() => navigation.navigate('Feed', { proyectoId: act.id, titulo: act.titulo, organizacionId: act.organizacionId })}
      />
    </Pantalla>
  );
}

const styles = estilosDinamicos(() => ({
  portada: { borderRadius: 30, padding: espacio.l, paddingTop: espacio.xl, overflow: 'hidden', marginBottom: espacio.m, minHeight: 190, justifyContent: 'flex-end' },
  titulo: { fontFamily: fuentes.titulo, fontSize: 28, lineHeight: 32 },
  org: { fontFamily: fuentes.textoMedio, fontSize: 15, marginTop: 4, opacity: 0.95 },
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: espacio.xs },
  cuposFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: espacio.s },
  cuposTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 17, color: colores.tinta },
  cuposNumero: { fontFamily: fuentes.negrita, color: colores.mentaOscuro },
  seccion: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta, marginBottom: 6 },
  descripcion: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 23, color: colores.tinta, marginBottom: espacio.m },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap' },
}));
