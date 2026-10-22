import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Hero from '../../components/Hero';
import { Aparecer, Boton, Cargando, EstadoBadge, MensajeError, Tarjeta, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { cancelarInscripcion, descargarCertificado, misInscripciones } from '../../api/inscripciones';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, estilosEstado, fuentes } from '../../constants/tema';
import { diaMes, rangoFechas } from '../../utils/formato';

export default function MisInscripcionesScreen({ navigation }) {
  const { datos, cargando, error, recargar } = useCarga(() => misInscripciones({ limit: 50 }), []);
  const [ocupado, setOcupado] = useState(null);

  const cancelar = (ins) => {
    Alert.alert('Cancelar inscripción', `¿Seguro que querés cancelar tu inscripción a "${ins.actividad.titulo}"?`, [
      { text: 'No' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setOcupado(ins.id);
          try {
            await cancelarInscripcion(ins.id);
            recargar();
          } catch (e) {
            Alert.alert('No se pudo cancelar', mensajeDeError(e));
          } finally {
            setOcupado(null);
          }
        },
      },
    ]);
  };

  const certificado = async (ins) => {
    setOcupado(ins.id);
    try {
      const bytes = await descargarCertificado(ins.id);
      const archivo = new File(Paths.cache, `certificado-${ins.id}.pdf`);
      archivo.create({ overwrite: true });
      archivo.write(new Uint8Array(bytes));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(archivo.uri, { mimeType: 'application/pdf', dialogTitle: 'Certificado de participación' });
      } else {
        Alert.alert('Certificado descargado', archivo.uri);
      }
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        status === 409
          ? 'Todavía no hay una asistencia validada para esta actividad.'
          : status === 403
            ? 'No tenés permiso para descargar este certificado.'
            : mensajeDeError(e);
      Alert.alert('Certificado', msg);
    } finally {
      setOcupado(null);
    }
  };

  const lista = datos?.data || [];
  const aceptadas = lista.filter((i) => i.estado === 'aceptada').length;

  return (
    <FlatList
      style={styles.contenedor}
      data={lista}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={cargando && !!datos} onRefresh={recargar} tintColor={colores.coral} />}
      ListHeaderComponent={
        <>
          <Hero
            titulo="Mis inscripciones"
            subtitulo={lista.length ? `Estás en ${lista.length} ${lista.length === 1 ? 'actividad' : 'actividades'} · ${aceptadas} confirmadas` : 'Acá vas a ver tus actividades'}
           
            tema="menta"
            figuras={1}
          />
          <View style={styles.relleno}>
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="Todavía no te inscribiste a ninguna actividad. ¡Buscá una en Actividades!" />}
      renderItem={({ item: ins, index }) => {
        const { dia, mes } = diaMes(ins.actividad.fechaInicio);
        const e = estilosEstado[ins.estado] || {};
        return (
          <Aparecer indice={index} estilo={styles.relleno}>
            <Tarjeta acento={e.texto}>
              <View style={styles.cabecera}>
                <View style={[styles.fecha, { backgroundColor: e.fondo }]}>
                  <Text style={[styles.dia, { color: e.texto }]}>{dia}</Text>
                  <Text style={[styles.mes, { color: e.texto }]}>{mes}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.titulo}>{ins.actividad.titulo}</Text>
                  <Text style={styles.linea}>{rangoFechas(ins.actividad.fechaInicio, ins.actividad.fechaFin)}</Text>
                  <View style={{ marginTop: 6 }}>
                    <EstadoBadge estado={ins.estado} />
                  </View>
                </View>
              </View>

              {ins.estado === 'pendiente' ? <Text style={styles.nota}>Esperando que el coordinador confirme tu lugar.</Text> : null}

              {ins.estado === 'aceptada' ? (
                <View style={styles.acciones}>
                  <Boton
                    titulo="Marcar asistencia"
                   
                    variante="exito"
                    onPress={() => navigation.navigate('EscanearQR', { actividadId: ins.actividadId, titulo: ins.actividad.titulo })}
                  />
                  <Boton titulo="Mi certificado" variante="sol" onPress={() => certificado(ins)} cargando={ocupado === ins.id} />
                </View>
              ) : null}
              {['pendiente', 'aceptada'].includes(ins.estado) ? (
                <Boton titulo="Cancelar inscripción" variante="borde" chico onPress={() => cancelar(ins)} deshabilitado={ocupado === ins.id} />
              ) : null}
            </Tarjeta>
          </Aparecer>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.l },
  cabecera: { flexDirection: 'row', gap: espacio.m, marginBottom: espacio.s },
  fecha: { width: 54, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dia: { fontFamily: fuentes.titulo, fontSize: 22, lineHeight: 24 },
  mes: { fontFamily: fuentes.negrita, fontSize: 11, letterSpacing: 1 },
  flex: { flex: 1 },
  titulo: { fontFamily: fuentes.tituloMedio, fontSize: 17, color: colores.tinta },
  linea: { fontFamily: fuentes.texto, color: colores.tintaSuave, fontSize: 13, marginTop: 2 },
  nota: { fontFamily: fuentes.textoMedio, color: colores.tintaSuave, marginBottom: espacio.s },
  acciones: { marginBottom: 2 },
}));
