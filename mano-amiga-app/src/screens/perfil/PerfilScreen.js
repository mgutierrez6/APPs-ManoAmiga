import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aparecer, Avatar, BarraProgreso, Boton, Cargando, MensajeError, Subtitulo, Tarjeta, TextoSuave } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../hooks/useTema';
import { actualizarPerfil, misHoras, obtenerPerfil } from '../../api/usuarios';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';

const ROLES = {
  voluntario: { texto: 'Voluntario/a' },
  coordinador: { texto: 'Coordinador/a' },
  admin: { texto: 'Administrador/a' },
};

const TEMAS = [
  { valor: 'sistema', texto: 'Automático' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
];

/**
 * Perfil (R8 / R16): datos de contacto, tema, contraseña, historial de accesos y horas judiciales.
 * Todo lo que se muestra es del propio usuario: la API usa el id del token, nunca uno de la URL (RS2).
 */
export default function PerfilScreen({ navigation }) {
  const { logout, actualizarUsuario } = useAuth();
  const { preferencia, setPreferenciaLocal, limpiarPreferenciaLocal } = useTema();
  const insets = useSafeAreaInsets();
  const [errorTema, setErrorTema] = useState(null);
  const { datos, cargando, error, recargar } = useCarga(async () => {
    const perfil = await obtenerPerfil();
    const horas = perfil.esJudicial ? await misHoras() : null;
    return { perfil, horas };
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

  if (cargando && !datos) return <Cargando />;
  const p = datos?.perfil;
  const rol = ROLES[p?.rol] || ROLES.voluntario;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <View style={[styles.hero, { paddingTop: insets.top + espacio.xl }]}>
        {p ? (
          <View style={styles.heroCentro}>
            <View style={styles.avatarAro}>
              <Avatar nombre={p.nombre} apellido={p.apellido} tamano={92} />
            </View>
            <Text style={styles.nombre}>
              {p.nombre} {p.apellido}
            </Text>
            <View style={styles.rol}>
              <Text style={styles.rolTexto}>
                {rol.texto}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.cuerpo}>
        <MensajeError texto={error} onReintentar={recargar} />
        {p ? (
          <>
            <Aparecer>
              <Tarjeta>
                <Fila etiqueta="Email" valor={p.email} />
                <Fila etiqueta="Teléfono" valor={p.telefono || 'Sin teléfono'} />
                <Boton titulo="Editar mis datos" variante="borde" chico onPress={() => navigation.navigate('EditarPerfil', { perfil: p })} estilo={{ marginTop: espacio.s }} />
              </Tarjeta>
            </Aparecer>

            {datos.horas ? (
              <Aparecer indice={1}>
                <Subtitulo>Horas de trabajo comunitario</Subtitulo>
                <Tarjeta>
                  <View style={styles.horasCabecera}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.horasGrande}>
                        {datos.horas.horasCumplidas} <Text style={styles.horasDe}>de {datos.horas.horasAsignadas} h</Text>
                      </Text>
                      <TextoSuave>
                        {datos.horas.horasRestantes > 0 ? `¡Te faltan ${datos.horas.horasRestantes} horas!` : '¡Completaste tus horas!'}
                      </TextoSuave>
                    </View>
                  </View>
                  <BarraProgreso valor={datos.horas.horasCumplidas} total={datos.horas.horasAsignadas || 1} color={colores.lila} />
                  <TextoSuave estilo={{ marginTop: 10 }}>Solo cuentan las asistencias validadas por un coordinador.</TextoSuave>
                </Tarjeta>
              </Aparecer>
            ) : null}

            <Aparecer indice={2}>
              <Subtitulo>Apariencia</Subtitulo>
              <View style={styles.temas}>
                {TEMAS.map((t) => {
                  const activo = preferencia === t.valor;
                  return (
                    <Pressable
                      key={t.valor}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: activo }}
                      onPress={() => elegirTema(t.valor)}
                      style={({ pressed }) => [styles.tema, activo && styles.temaActivo, pressed && { transform: [{ scale: 0.96 }] }]}
                    >
                      <Text style={[styles.temaTexto, activo && styles.temaTextoActivo]}>{t.texto}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <MensajeError texto={errorTema} />
            </Aparecer>

            <Aparecer indice={3}>
              <Subtitulo>Seguridad</Subtitulo>
              <Tarjeta onPress={() => navigation.navigate('CambiarPassword')} acento={colores.coral}>
                <Opcion titulo="Cambiar contraseña" texto="Se cierran las sesiones en tus otros dispositivos." />
              </Tarjeta>
              <Tarjeta onPress={() => navigation.navigate('Accesos')} acento={colores.oceano}>
                <Opcion titulo="Historial de accesos" texto="Revisá cuándo y desde dónde se usó tu cuenta." />
              </Tarjeta>
            </Aparecer>
          </>
        ) : null}
        <Boton titulo="Cerrar sesión" variante="borde" onPress={logout} estilo={{ marginTop: espacio.m }} />
      </View>
    </ScrollView>
  );
}

function Fila({ etiqueta, valor }) {
  return (
    <View style={styles.fila}>
      <View style={{ flex: 1 }}>
        <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
        <Text style={styles.filaValor}>{valor}</Text>
      </View>
    </View>
  );
}

function Opcion({ titulo, texto }) {
  return (
    <View style={styles.fila}>
      <View style={{ flex: 1 }}>
        <Text style={styles.opcionTitulo}>{titulo}</Text>
        <TextoSuave>{texto}</TextoSuave>
      </View>
      <Text style={styles.flecha}>›</Text>
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  contenido: { paddingBottom: espacio.xxl },
  hero: { paddingBottom: espacio.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: colores.lila },
  heroCentro: { alignItems: 'center' },
  avatarAro: { padding: 4, borderRadius: 60, backgroundColor: colores.tarjeta },
  nombre: { fontFamily: fuentes.titulo, fontSize: 26, color: colores.blanco, marginTop: espacio.m },
  rol: { backgroundColor: colores.tarjeta, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, marginTop: 6 },
  rolTexto: { fontFamily: fuentes.negrita, color: colores.lilaTexto },
  cuerpo: { padding: espacio.l },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingVertical: 8 },
  filaEtiqueta: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.gris },
  filaValor: { fontFamily: fuentes.textoMedio, fontSize: 15, color: colores.tinta },
  opcionTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 16, color: colores.tinta },
  flecha: { fontFamily: fuentes.titulo, fontSize: 26, color: colores.gris },
  horasCabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginBottom: espacio.m },
  horasGrande: { fontFamily: fuentes.titulo, fontSize: 30, color: colores.lila },
  horasDe: { fontFamily: fuentes.textoMedio, fontSize: 16, color: colores.tintaSuave },
  temas: { flexDirection: 'row', gap: espacio.s, marginBottom: espacio.s },
  tema: { flex: 1, alignItems: 'center', paddingVertical: espacio.m, borderRadius: 16, backgroundColor: colores.tarjeta, borderWidth: 1.5, borderColor: colores.borde },
  temaActivo: { backgroundColor: colores.lilaSuave, borderColor: colores.lila },
  temaTexto: { fontFamily: fuentes.textoMedio, color: colores.tintaSuave },
  temaTextoActivo: { fontFamily: fuentes.negrita, color: colores.tinta },
}));
