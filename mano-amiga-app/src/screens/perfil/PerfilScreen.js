import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono from '../../components/Icono';
import { Aparecer, Avatar, BarraProgreso, Cargando, MensajeError, Segmentos } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../hooks/useTema';
import { actualizarPerfil, misHoras, obtenerPerfil } from '../../api/usuarios';
import { misHistorias } from '../../api/historias';
import { perfilOrganizacion } from '../../api/organizaciones';
import { mensajeDeError } from '../../api/client';
import { elegirYSubir } from '../../utils/fotos';
import { colores, espacio, estilosDinamicos, fuentes, paletas, tituloGrande } from '../../constants/tema';

const TEMAS = [
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'sistema', texto: 'Sistema' },
];

/**
 * Perfil (R8 / R16). Todo es del propio usuario: la API usa el id del token, nunca uno de la URL (RS2).
 *  - Voluntario judicial: sus horas del programa (las horas solo le importan a él/ella).
 *  - Voluntario común: la carpeta "Mi historia".
 *  - Coordinador: acceso al perfil de su organización.
 */
export default function PerfilScreen({ navigation }) {
  const { logout, actualizarUsuario } = useAuth();
  const { preferencia, setPreferenciaLocal, limpiarPreferenciaLocal } = useTema();
  const insets = useSafeAreaInsets();
  const [errorTema, setErrorTema] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const { datos, setDatos, cargando, error, recargar } = useCarga(async () => {
    const perfil = await obtenerPerfil();
    const [horas, historias, org] = await Promise.all([
      perfil.esJudicial ? misHoras() : null,
      perfil.rol === 'voluntario' && !perfil.esJudicial ? misHistorias().catch(() => []) : null,
      perfil.rol === 'coordinador' && perfil.organizacionId ? perfilOrganizacion(perfil.organizacionId).catch(() => null) : null,
    ]);
    return { perfil, horas, historias, org };
  }, []);

  // El tema se aplica al instante y después se guarda en el servidor (queda en el perfil).
  const elegirTema = async (tema) => {
    if (tema === preferencia) return;
    setErrorTema(null);
    setPreferenciaLocal(tema);
    try {
      const p = await actualizarPerfil({ preferencias: { tema } });
      actualizarUsuario({ preferencias: p.preferencias });
      limpiarPreferenciaLocal();
    } catch (e) {
      limpiarPreferenciaLocal(); // vuelve al tema que estaba guardado
      setErrorTema(mensajeDeError(e));
    }
  };

  const cambiarFoto = async () => {
    setSubiendoFoto(true);
    try {
      const [foto] = await elegirYSubir('perfil');
      if (foto) {
        const p = await actualizarPerfil({ fotoId: foto.id });
        setDatos((d) => ({ ...d, perfil: p }));
      }
    } catch (e) {
      Alert.alert('No se pudo cambiar la foto', mensajeDeError(e));
    } finally {
      setSubiendoFoto(false);
    }
  };

  if (cargando && !datos) return <Cargando />;
  const p = datos?.perfil;
  const rolTexto = p?.rol === 'coordinador' ? `Coordinador/a${datos?.org ? ` · ${datos.org.nombre}` : ''}` : p?.rol === 'admin' ? 'Administrador/a' : p?.esJudicial ? 'Voluntario/a · programa judicial' : 'Voluntario/a';
  const cantHistorias = datos?.historias?.length || 0;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ paddingTop: insets.top + espacio.xl, paddingBottom: espacio.xxl, paddingHorizontal: espacio.xl }}>
      <MensajeError texto={error} onReintentar={recargar} />
      {p ? (
        <>
          <View style={styles.cabecera}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" onPress={cambiarFoto} disabled={subiendoFoto}>
              <Avatar nombre={p.nombre} apellido={p.apellido} tamano={76} foto={p.foto} />
              <View style={styles.mas}>
                <Text style={styles.masTexto}>{subiendoFoto ? '…' : '+'}</Text>
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>
                {p.nombre}
                {'\n'}
                {p.apellido}
              </Text>
              <Text style={styles.rol} numberOfLines={2}>
                {rolTexto}
              </Text>
            </View>
          </View>

          {datos.horas ? (
            <Aparecer>
              <View style={styles.judicial}>
                <View style={styles.judicialFila}>
                  <Text style={styles.judicialEtiqueta}>Programa judicial</Text>
                  <Text style={styles.judicialEtiqueta}>
                    {datos.horas.horasRestantes > 0 ? `te faltan ${datos.horas.horasRestantes} h` : '¡completaste tus horas!'}
                  </Text>
                </View>
                <Text style={styles.judicialNumero}>
                  {datos.horas.horasCumplidas}
                  <Text style={styles.judicialDe}> / {datos.horas.horasAsignadas} h</Text>
                </Text>
                <BarraProgreso valor={datos.horas.horasCumplidas} total={datos.horas.horasAsignadas || 1} color={colores.sol} fondo="rgba(255,255,255,0.35)" />
                <Text style={styles.judicialNota}>Solo cuentan las asistencias validadas por un coordinador.</Text>
              </View>
            </Aparecer>
          ) : null}

          {p.rol === 'voluntario' && !p.esJudicial ? (
            <Aparecer>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir Mi historia" onPress={() => navigation.navigate('MiHistoria')} style={styles.carpeta}>
                <View style={styles.carpetaPestana} />
                <View style={styles.carpetaFondo} />
                <View style={[styles.carpetaHoja, { backgroundColor: '#B7D665', left: 150, right: 56, top: 26, transform: [{ rotate: '-7deg' }] }]} />
                <View style={[styles.carpetaHoja, { backgroundColor: '#407ADD', left: 176, right: 30, top: 22, transform: [{ rotate: '5deg' }] }]} />
                <View style={[styles.carpetaHoja, { backgroundColor: '#E763A5', left: 196, right: 14, top: 34, transform: [{ rotate: '-2deg' }] }]} />
                <View style={styles.carpetaFrente}>
                  <View>
                    <Text style={styles.carpetaTitulo}>Mi historia</Text>
                    <Text style={styles.carpetaTexto}>
                      {cantHistorias} {cantHistorias === 1 ? 'actividad' : 'actividades'}
                    </Text>
                  </View>
                  <View style={styles.carpetaFlecha}>
                    <Icono nombre="derecha" color={paletas.claro.tinta} tamano={18} grosor={2.2} />
                  </View>
                </View>
              </Pressable>
            </Aparecer>
          ) : null}

          {p.rol === 'coordinador' && datos.org ? (
            <Aparecer>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('MiOrganizacion')} style={styles.org}>
                <View style={styles.orgLogo}>
                  <Icono nombre="organizaciones" color="#FFFFFF" tamano={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgEtiqueta}>Tu organización</Text>
                  <Text style={styles.orgNombre} numberOfLines={1}>
                    {datos.org.nombre}
                  </Text>
                </View>
                <Text style={styles.orgVer}>Ver perfil →</Text>
              </Pressable>
            </Aparecer>
          ) : null}

          <View style={styles.menu}>
            <Fila titulo="Mis datos" onPress={() => navigation.navigate('EditarPerfil', { perfil: p })} />
            <Fila titulo="Cambiar contraseña" onPress={() => navigation.navigate('CambiarPassword')} />
            <Fila titulo="Historial de accesos" onPress={() => navigation.navigate('Accesos')} />
            <View style={styles.temaFila}>
              <Text style={styles.filaTexto}>Tema</Text>
              <Segmentos opciones={TEMAS} valor={preferencia} onChange={elegirTema} estilo={styles.temaSegmentos} />
            </View>
          </View>
          <MensajeError texto={errorTema} />
        </>
      ) : null}
      <Pressable accessibilityRole="button" onPress={logout} style={styles.salir}>
        <Text style={styles.salirTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

function Fila({ titulo, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.fila, pressed && { opacity: 0.6 }]}>
      <Text style={styles.filaTexto}>{titulo}</Text>
      <Icono nombre="derecha" color={colores.tintaSuave} tamano={18} />
    </Pressable>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mas: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colores.tinta, borderWidth: 3, borderColor: colores.crema, alignItems: 'center', justifyContent: 'center' },
  masTexto: { fontFamily: fuentes.negrita, fontSize: 16, lineHeight: 18, color: colores.crema },
  nombre: { ...tituloGrande(32), color: colores.tinta },
  rol: { fontFamily: fuentes.texto, fontSize: 13, color: colores.tintaSuave, marginTop: 6 },

  judicial: { marginTop: espacio.xl, backgroundColor: colores.coral, borderRadius: 28, padding: 20, gap: 10 },
  judicialFila: { flexDirection: 'row', justifyContent: 'space-between' },
  judicialEtiqueta: { fontFamily: fuentes.negrita, fontSize: 13, color: '#FFFFFF' },
  judicialNumero: { fontFamily: fuentes.numero, fontSize: 52, lineHeight: 56, letterSpacing: -2, color: '#FFFFFF' },
  judicialDe: { fontSize: 22, letterSpacing: 0 },
  judicialNota: { fontFamily: fuentes.texto, fontSize: 12, color: '#FFFFFF', opacity: 0.9 },

  carpeta: { marginTop: espacio.xl, height: 150 },
  carpetaPestana: { position: 'absolute', left: 0, top: 0, width: 120, height: 30, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: paletas.claro.tinta },
  carpetaFondo: { position: 'absolute', left: 0, right: 0, top: 14, bottom: 0, borderRadius: 24, borderTopLeftRadius: 0, backgroundColor: paletas.claro.tinta },
  carpetaHoja: { position: 'absolute', height: 60, borderRadius: 14 },
  carpetaFrente: { position: 'absolute', left: 0, right: 0, top: 58, bottom: 0, borderRadius: 22, backgroundColor: '#F9C386', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  carpetaTitulo: { ...tituloGrande(30), color: paletas.claro.tinta },
  carpetaTexto: { fontFamily: fuentes.texto, fontSize: 13, color: paletas.claro.tinta, marginTop: 4 },
  carpetaFlecha: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  org: { marginTop: espacio.xl, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 24, padding: 14 },
  orgLogo: { width: 52, height: 52, borderRadius: 17, backgroundColor: colores.coral, alignItems: 'center', justifyContent: 'center' },
  orgEtiqueta: { fontFamily: fuentes.texto, fontSize: 12, color: colores.tintaSuave },
  orgNombre: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  orgVer: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.coral },

  menu: { marginTop: espacio.l, backgroundColor: colores.tarjeta, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colores.linea },
  filaTexto: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  temaFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, gap: 12 },
  temaSegmentos: { flex: 1, maxWidth: 230 },
  salir: { alignSelf: 'center', padding: 14, marginTop: espacio.m },
  salirTexto: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.coral },
}));
