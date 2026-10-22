import { FlatList, Text, View } from 'react-native';
import Hero from '../../components/Hero';
import { Aparecer, Avatar, BarraProgreso, Cargando, MensajeError, Tarjeta, TextoSuave, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { horasJudiciales } from '../../api/admin';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';

/** R7 · Horas del programa judicial: asignadas vs. cumplidas (solo cuentan asistencias VALIDADAS). */
export default function AdminJudicialesScreen() {
  const { datos, cargando, error, recargar } = useCarga(() => horasJudiciales({ limit: 50 }), []);
  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={datos?.data || []}
      keyExtractor={(u) => u.id}
      ListHeaderComponent={
        <>
          <Hero titulo="Programa judicial" subtitulo="Avance de horas comunitarias" tema="sol" figuras={0} />
          <View style={styles.relleno}>
            <TextoSuave estilo={{ marginVertical: espacio.m }}>Para sumar a alguien al programa, buscalo en la pestaña Usuarios.</TextoSuave>
            <MensajeError texto={error} onReintentar={recargar} />
          </View>
        </>
      }
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No hay voluntarios en el programa judicial." />}
      renderItem={({ item, index }) => {
        const completo = item.horasRestantes === 0;
        return (
          <Aparecer indice={index} estilo={styles.relleno}>
            <Tarjeta acento={completo ? colores.menta : colores.lila}>
              <View style={styles.fila}>
                <Avatar nombre={item.nombre} apellido={item.apellido} tamano={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>
                    {item.nombre} {item.apellido}
                  </Text>
                  <TextoSuave numberOfLines={1}>{item.email}</TextoSuave>
                </View>
                <Text style={styles.horas}>
                  {item.horasCumplidas}
                  <Text style={styles.de}>/{item.horasAsignadas} h</Text>
                </Text>
              </View>
              <BarraProgreso valor={item.horasCumplidas} total={item.horasAsignadas || 1} color={completo ? colores.menta : colores.lila} />
              <TextoSuave estilo={{ marginTop: 8 }}>{completo ? 'Completó sus horas' : `Le faltan ${item.horasRestantes} h`}</TextoSuave>
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
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginBottom: espacio.m },
  nombre: { fontFamily: fuentes.tituloMedio, fontSize: 16, color: colores.tinta },
  horas: { fontFamily: fuentes.titulo, fontSize: 24, color: colores.lila },
  de: { fontFamily: fuentes.textoMedio, fontSize: 14, color: colores.tintaSuave },
}));
