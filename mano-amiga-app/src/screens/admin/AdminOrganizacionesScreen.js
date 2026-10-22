import { useState } from 'react';
import { FlatList, Switch, Text, View } from 'react-native';
import Hero from '../../components/Hero';
import { Aparecer, Boton, Campo, Cargando, EstadoBadge, MensajeError, Pastilla, Subtitulo, Tarjeta, TextoSuave, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { bajaOrganizacion, crearOrganizacion, listarOrganizaciones } from '../../api/admin';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { confirmar } from '../../utils/confirmar';

/**
 * R7 · Alta y baja de organizaciones. Las dos acciones piden la contraseña del admin (RS9).
 * La baja deja a la organización inactiva y sus coordinadores pierden el acceso al instante (RS5).
 */
export default function AdminOrganizacionesScreen() {
  const { datos, cargando, error, recargar } = useCarga(() => listarOrganizaciones({ limit: 50 }), []);
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [osla, setOsla] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const crear = async () => {
    if (nombre.trim().length < 2) return setErrorForm('El nombre necesita al menos 2 letras');
    setCreando(true);
    setErrorForm(null);
    setMensaje(null);
    try {
      const org = await crearOrganizacion({ nombre: nombre.trim(), contacto: contacto.trim(), convenioOSLA: osla });
      setNombre('');
      setContacto('');
      setOsla(false);
      setMensaje(`"${org.nombre}" quedó dada de alta.`);
      recargar();
    } catch (e) {
      setErrorForm(mensajeDeError(e));
    } finally {
      setCreando(false);
    }
  };

  const darDeBaja = async (org) => {
    const ok = await confirmar(
      `¿Dar de baja "${org.nombre}"?`,
      `Sus ${org.coordinadores} coordinador/es pierden el acceso al instante y sus actividades publicadas se cancelan.`,
      'Dar de baja'
    );
    if (!ok) return;
    setErrorAccion(null);
    try {
      await bajaOrganizacion(org.id);
      setMensaje(`"${org.nombre}" quedó dada de baja.`);
      recargar();
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
    }
  };

  const cabecera = (
    <>
      <Hero titulo="Organizaciones" subtitulo="Altas, bajas y convenios" tema="oceano" figuras={2} />
      <View style={styles.relleno}>
        <Subtitulo>Nueva organización</Subtitulo>
        <Tarjeta acento={colores.oceano}>
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} maxLength={100} placeholder="Ej.: Fundación Techo" />
          <Campo etiqueta="Contacto (opcional)" value={contacto} onChangeText={setContacto} maxLength={120} placeholder="Email o teléfono institucional" />
          <View style={styles.switchFila}>
            <Text style={styles.switchTexto}>Convenio con OSLA (programa judicial)</Text>
            <Switch value={osla} onValueChange={setOsla} trackColor={{ true: colores.menta, false: colores.borde }} thumbColor={colores.blanco} />
          </View>
          <MensajeError texto={errorForm} />
          <Boton titulo="Dar de alta" variante="secundario" onPress={crear} cargando={creando} />
        </Tarjeta>
        {mensaje ? <TextoSuave estilo={styles.mensaje}>{mensaje}</TextoSuave> : null}
        <MensajeError texto={error || errorAccion} onReintentar={error ? recargar : undefined} />
        <Subtitulo>Todas ({datos?.total ?? 0})</Subtitulo>
      </View>
    </>
  );

  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={datos?.data || []}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="Todavía no hay organizaciones." />}
      renderItem={({ item, index }) => (
        <Aparecer indice={index} estilo={styles.relleno}>
          <Tarjeta acento={item.activa ? colores.menta : colores.gris}>
            <View style={styles.fila}>
              <Text style={styles.nombre} numberOfLines={2}>
                {item.nombre}
              </Text>
              <EstadoBadge estado={item.activa ? 'activa' : 'inactiva'} />
            </View>
            {item.contacto ? <TextoSuave>{item.contacto}</TextoSuave> : null}
            <View style={styles.pastillas}>
              <Pastilla texto={`${item.coordinadores} coordinador/es`} clave="coord" />
              {item.convenioOSLA ? <Pastilla texto="Convenio OSLA" clave="osla" /> : null}
            </View>
            {item.activa ? <Boton titulo="Dar de baja" variante="peligro" chico onPress={() => darDeBaja(item)} /> : null}
          </Tarjeta>
        </Aparecer>
      )}
    />
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.l },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.s, marginBottom: 6 },
  nombre: { flex: 1, fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta },
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', marginTop: espacio.s },
  switchFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espacio.m, gap: espacio.s },
  switchTexto: { flex: 1, fontFamily: fuentes.textoMedio, color: colores.tinta },
  mensaje: { marginBottom: espacio.s, color: colores.mentaTexto, fontFamily: fuentes.negrita },
}));
