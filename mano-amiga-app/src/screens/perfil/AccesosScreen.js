import { FlatList, Text, View } from 'react-native';
import { Aparecer, Cargando, MensajeError, Tarjeta, TextoSuave, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { misAccesos } from '../../api/usuarios';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { fechaHora } from '../../utils/formato';

const ACCIONES = {
  login: { ok: { texto: 'Inicio de sesión' }, fallo: { texto: 'Intento de inicio fallido' } },
  logout: { ok: { texto: 'Cierre de sesión' } },
  password_cambio: { ok: { texto: 'Cambio de contraseña' }, fallo: { texto: 'Cambio de contraseña fallido' } },
  refresh_reusado: { denegado: { texto: 'Sesión cerrada por uso sospechoso' } },
};

function describir(a) {
  const porAccion = ACCIONES[a.accion] || {};
  return porAccion[a.resultado] || { texto: a.accion };
}

/** Historial de accesos (R8): solo los eventos de la propia cuenta (la API filtra por el id del token). */
export default function AccesosScreen() {
  const { datos, cargando, error, recargar } = useCarga(() => misAccesos({ limit: 50 }), []);
  if (cargando && !datos) return <Cargando />;

  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={datos?.data || []}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <>
          <TextoSuave estilo={{ marginBottom: espacio.m }}>¿Ves algo que no fuiste vos? Cambiá tu contraseña: se cierran todas las sesiones.</TextoSuave>
          <MensajeError texto={error} onReintentar={recargar} />
        </>
      }
      ListEmptyComponent={<Vacio titulo="Sin accesos registrados" texto="Acá vas a ver tus inicios de sesión." />}
      renderItem={({ item, index }) => {
        const d = describir(item);
        const alerta = item.resultado !== 'ok';
        return (
          <Aparecer indice={index}>
            <Tarjeta acento={alerta ? colores.coral : colores.menta}>
              <View style={styles.fila}>
                <View style={[styles.punto, { backgroundColor: alerta ? colores.coral : colores.menta }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.titulo}>{d.texto}</Text>
                  <TextoSuave>{fechaHora(item.fecha)}</TextoSuave>
                  {item.dispositivo ? (
                    <TextoSuave numberOfLines={1} estilo={styles.chico}>
                      {item.dispositivo}
                    </TextoSuave>
                  ) : null}
                  {item.ip ? <TextoSuave estilo={styles.chico}>{item.ip}</TextoSuave> : null}
                </View>
              </View>
            </Tarjeta>
          </Aparecer>
        );
      }}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { padding: espacio.l, flexGrow: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  punto: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  titulo: { fontFamily: fuentes.tituloMedio, fontSize: 16, color: colores.tinta },
  chico: { fontSize: 12 },
}));
