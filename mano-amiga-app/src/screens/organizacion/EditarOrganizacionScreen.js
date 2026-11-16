import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Pantalla from '../../components/Pantalla';
import ImagenApi from '../../components/ImagenApi';
import Icono from '../../components/Icono';
import { Boton, Campo, MensajeError, Subtitulo, Tarjeta, TextoSuave } from '../../components/ui';
import { editarMiOrganizacion } from '../../api/organizaciones';
import { mensajeDeError } from '../../api/client';
import { elegirYSubir } from '../../utils/fotos';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';

/**
 * El coordinador edita el perfil público de SU organización: logo, portada, descripción, rubro y zona.
 * El nombre y el convenio solo los cambia el administrador. La organización la toma la API del token.
 */
export default function EditarOrganizacionScreen({ route, navigation }) {
  const p = route.params?.perfil || {};
  const [form, setForm] = useState({ descripcion: p.descripcion || '', rubro: p.rubro || '', zona: p.zona || '' });
  const [logo, setLogo] = useState({ id: undefined, url: p.logo || null });
  const [portada, setPortada] = useState({ id: undefined, url: p.portada || null });
  const [subiendo, setSubiendo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const elegir = async (cual) => {
    setSubiendo(cual);
    try {
      const [subida] = await elegirYSubir('organizacion');
      if (subida) (cual === 'logo' ? setLogo : setPortada)(subida);
    } catch (e) {
      Alert.alert('No se pudo subir la foto', mensajeDeError(e));
    } finally {
      setSubiendo(null);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = { descripcion: form.descripcion.trim(), rubro: form.rubro.trim(), zona: form.zona.trim() };
      if (logo.id) datos.logoId = logo.id;
      if (portada.id) datos.portadaId = portada.id;
      await editarMiOrganizacion(datos);
      navigation.goBack();
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Pantalla>
      <MensajeError texto={error} />
      <Subtitulo estilo={{ marginTop: 0 }}>Fotos</Subtitulo>
      <Pressable accessibilityRole="button" accessibilityLabel="Cambiar la portada" onPress={() => elegir('portada')} style={styles.portada}>
        {portada.url ? <ImagenApi ruta={portada.url} estilo={styles.lleno} /> : null}
        <View style={styles.cambiar}>
          <Icono nombre="camara" color={colores.tintaFija} tamano={18} />
          <Text style={styles.cambiarTexto}>{subiendo === 'portada' ? 'Subiendo…' : 'Portada'}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cambiar el logo" onPress={() => elegir('logo')} style={styles.logo}>
        {logo.url ? <ImagenApi ruta={logo.url} estilo={styles.lleno} /> : <Icono nombre="organizaciones" color={colores.tintaSuave} tamano={30} />}
        <View style={styles.logoMas}>
          <Text style={styles.logoMasTexto}>{subiendo === 'logo' ? '…' : '+'}</Text>
        </View>
      </Pressable>
      <TextoSuave estilo={{ marginBottom: espacio.l }}>Las ve cualquier persona con sesión en la app. No subas fotos donde se vean datos personales.</TextoSuave>

      <Subtitulo>Sobre la organización</Subtitulo>
      <Tarjeta>
        <Campo etiqueta="Descripción" value={form.descripcion} onChangeText={set('descripcion')} multiline maxLength={500} placeholder="¿Qué hacen? ¿Cómo pueden ayudar los voluntarios?" />
        <Campo etiqueta="Rubro" value={form.rubro} onChangeText={set('rubro')} maxLength={60} placeholder="Medioambiente" />
        <Campo etiqueta="Zona" value={form.zona} onChangeText={set('zona')} maxLength={60} placeholder="Montevideo" />
      </Tarjeta>
      <Boton titulo="Guardar" onPress={guardar} cargando={guardando} deshabilitado={Boolean(subiendo)} />
    </Pantalla>
  );
}

const styles = estilosDinamicos(() => ({
  portada: { height: 130, borderRadius: 20, backgroundColor: colores.pista, overflow: 'hidden', justifyContent: 'flex-end', padding: 10 },
  lleno: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  cambiar: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  cambiarTexto: { fontFamily: fuentes.negrita, fontSize: 13, color: colores.tintaFija },
  logo: { width: 84, height: 84, borderRadius: 26, backgroundColor: colores.tarjeta, borderWidth: 4, borderColor: colores.crema, marginTop: -42, marginLeft: 16, marginBottom: espacio.s, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  logoMas: { position: 'absolute', right: -6, bottom: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: colores.tinta, borderWidth: 3, borderColor: colores.crema, alignItems: 'center', justifyContent: 'center' },
  logoMasTexto: { fontFamily: fuentes.negrita, fontSize: 16, lineHeight: 18, color: colores.crema },
}));
