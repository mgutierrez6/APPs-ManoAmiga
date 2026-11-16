import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import ImagenApi from '../../components/ImagenApi';
import Icono from '../../components/Icono';
import VisorFoto from '../../components/VisorFoto';
import { BotonPastilla, Cargando, MensajeError, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { perfilOrganizacion, proximasOrganizacion, publicacionesOrganizacion, realizadasDeMiOrganizacion } from '../../api/organizaciones';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes, paletas } from '../../constants/tema';
import { estiloTipo } from '../../constants/tipos';
import { diaMes, haceCuanto, hora } from '../../utils/formato';

/**
 * Perfil de una organización.
 *  - Voluntarios: ven la portada, los datos, las fotos de lo que ya hicieron (feed) y las próximas
 *    actividades (solo para mirar; anotarse se hace desde la actividad).
 *  - Coordinador de ESA organización: además puede publicar y editar el perfil.
 * Si no llega un id, es la pestaña "Organización" del coordinador: muestra la suya (la API la toma del token
 * para editar y publicar; acá solo se usa su id para leer).
 */
export default function OrganizacionScreen({ route, navigation }) {
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const idParam = route.params?.id;
  const orgId = idParam || usuario.organizacionId;
  const esMia = usuario.rol === 'coordinador' && orgId === usuario.organizacionId;
  const esPestana = !idParam;
  const [verProximas, setVerProximas] = useState(false);
  const [foto, setFoto] = useState(null);
  const [pubs, setPubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [masError, setMasError] = useState(null);

  const perfil = useCarga(() => perfilOrganizacion(orgId), [orgId]);
  const feed = useCarga(async () => {
    const r = await publicacionesOrganizacion(orgId, { page: 1, limit: 10 });
    setPubs(r.data);
    setTotal(r.total);
    setPagina(1);
    return r;
  }, [orgId]);
  const proximas = useCarga(() => proximasOrganizacion(orgId), [orgId]);
  const realizadas = useCarga(() => (esMia ? realizadasDeMiOrganizacion() : Promise.resolve([])), [esMia]);

  const cargarMas = useCallback(async () => {
    if (verProximas || pubs.length >= total) return;
    try {
      const r = await publicacionesOrganizacion(orgId, { page: pagina + 1, limit: 10 });
      setPubs((l) => [...l, ...r.data]);
      setPagina(pagina + 1);
    } catch (e) {
      setMasError(mensajeDeError(e));
    }
  }, [verProximas, pubs.length, total, pagina, orgId]);

  const recargar = () => {
    perfil.recargar();
    feed.recargar();
    proximas.recargar();
    realizadas.recargar();
  };

  const o = perfil.datos;
  if (perfil.cargando && !o) return <Cargando />;
  if (!o) {
    return (
      <View style={[styles.contenedor, { paddingTop: insets.top + espacio.l, paddingHorizontal: espacio.l }]}>
        <MensajeError texto={perfil.error || 'No pudimos cargar la organización.'} onReintentar={perfil.recargar} />
      </View>
    );
  }

  const sinPublicar = (realizadas.datos || []).filter((a) => !a.publicada);
  const listaProximas = proximas.datos || [];
  const coordinadores = o.coordinadores.map((c) => `${c.nombre}${c.inicial ? ` ${c.inicial}.` : ''}`);
  const textoCoord = coordinadores.length > 1 ? `${coordinadores.slice(0, -1).join(', ')} y ${coordinadores[coordinadores.length - 1]}` : coordinadores[0];

  const cabecera = (
    <View>
      <View style={styles.portada}>
        {o.portada ? <ImagenApi ruta={o.portada} estilo={styles.portadaImagen} accessibilityLabel="Portada de la organización" /> : <PortadaDibujo />}
        <View style={[styles.portadaBotones, { top: insets.top + espacio.s }]}>
          {esPestana ? <View /> : (
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={styles.botonVidrio}>
              <Icono nombre="izquierda" color={paletas.claro.tinta} tamano={20} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.relleno}>
        <View style={styles.logoAro}>
          {o.logo ? (
            <ImagenApi ruta={o.logo} estilo={styles.logo} accessibilityLabel="Logo" />
          ) : (
            <View style={[styles.logo, styles.logoVacio]}>
              <Icono nombre="organizaciones" color="#FFFFFF" tamano={36} />
            </View>
          )}
        </View>
        <Text style={styles.nombre}>{o.nombre}</Text>
        {o.rubro || o.zona ? <Text style={styles.rubro}>{[o.rubro, o.zona].filter(Boolean).join(' · ')}</Text> : null}
        {o.descripcion ? <Text style={styles.descripcion}>{o.descripcion}</Text> : esMia ? <Text style={styles.descripcionVacia}>Contale a los voluntarios qué hace tu organización desde "Editar perfil".</Text> : null}
        {textoCoord ? (
          <Text style={styles.coordinan}>
            Coordina{coordinadores.length > 1 ? 'n' : ''} <Text style={styles.coordinanNombres}>{textoCoord}</Text>
          </Text>
        ) : null}

        <View style={styles.pastillas}>
          {esMia ? (
            <>
              <BotonPastilla titulo="Publicar" icono="mas" primario onPress={() => navigation.navigate('NuevaPublicacion')} />
              <BotonPastilla titulo="Editar perfil" onPress={() => navigation.navigate('EditarOrganizacion', { perfil: o })} />
            </>
          ) : null}
          <BotonPastilla titulo={`Próximas · ${listaProximas.length}`} activo={verProximas} onPress={() => setVerProximas(!verProximas)} />
        </View>

        {esMia && sinPublicar.length > 0 && !verProximas ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('NuevaPublicacion', { actividadId: sinPublicar[0].id })}
            style={styles.aviso}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.avisoTitulo} numberOfLines={2}>
                {sinPublicar[0].titulo} ya terminó
              </Text>
              <Text style={styles.avisoTexto}>Publicalo para que lo vean todos{sinPublicar.length > 1 ? ` · y ${sinPublicar.length - 1} más` : ''}</Text>
            </View>
            <View style={styles.avisoBoton}>
              <Text style={styles.avisoBotonTexto}>Publicar</Text>
            </View>
          </Pressable>
        ) : null}
        <MensajeError texto={feed.error || proximas.error || masError} onReintentar={recargar} />
      </View>

      {verProximas ? (
        <View style={styles.relleno}>
          <Text style={styles.seccion}>Próximas actividades</Text>
          <Text style={styles.ayuda}>Para anotarte entrá a la actividad.</Text>
        </View>
      ) : (
        <View style={styles.separadorFeed} />
      )}
    </View>
  );

  if (verProximas) {
    return (
      <FlatList
        style={styles.contenedor}
        data={listaProximas}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={cabecera}
        contentContainerStyle={{ paddingBottom: espacio.xxl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} tintColor={colores.coral} />}
        ListEmptyComponent={proximas.cargando ? <Cargando /> : <Vacio texto="Por ahora no hay actividades programadas." />}
        renderItem={({ item: a }) => {
          const { dia, mes } = diaMes(a.fechaInicio);
          const t = estiloTipo(a.tipo);
          return (
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ActividadDetalle', { id: a.id })} style={styles.proxima}>
              <View style={[styles.proximaFecha, { borderColor: t.esTipo ? t.color : colores.borde }]}>
                <Text style={styles.proximaDia}>{dia}</Text>
                <Text style={styles.proximaMes}>{mes}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proximaTitulo} numberOfLines={2}>
                  {a.titulo}
                </Text>
                <Text style={styles.proximaHora}>
                  {hora(a.fechaInicio)} a {hora(a.fechaFin)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    );
  }

  return (
    <>
      <FlatList
        style={styles.contenedor}
        data={pubs}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={cabecera}
        contentContainerStyle={{ paddingBottom: espacio.xxl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} tintColor={colores.coral} />}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          feed.cargando ? (
            <Cargando />
          ) : (
            <Vacio titulo="Todavía no hay fotos" texto={esMia ? 'Cuando termine una actividad, publicá las fotos para que las vean todos.' : 'Cuando la organización publique lo que hizo, lo vas a ver acá.'} />
          )
        }
        renderItem={({ item: p }) => <Publicacion p={p} org={o} onFoto={setFoto} />}
      />
      <VisorFoto ruta={foto} onCerrar={() => setFoto(null)} />
    </>
  );
}

/** Publicación estilo LinkedIn: encabezado, texto, fotos a todo el ancho y la actividad. */
function Publicacion({ p, org, onFoto }) {
  const fotos = p.fotos || [];
  const t = estiloTipo(p.actividad?.tipo);
  const fecha = p.actividad ? diaMes(p.actividad.fechaInicio) : null;
  return (
    <View style={styles.post}>
      <View style={styles.postCabecera}>
        {org.logo ? <ImagenApi ruta={org.logo} estilo={styles.postLogo} /> : (
          <View style={[styles.postLogo, styles.logoVacio]}>
            <Icono nombre="organizaciones" color="#FFFFFF" tamano={20} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.postOrg} numberOfLines={1}>
            {org.nombre}
          </Text>
          <Text style={styles.postMeta}>
            {p.autor?.nombre ? `${p.autor.nombre} · ` : ''}
            {haceCuanto(p.fecha)}
          </Text>
        </View>
      </View>
      {p.contenido ? <Text style={styles.postTexto}>{p.contenido}</Text> : null}
      {fotos.length ? <Fotos fotos={fotos} onFoto={onFoto} /> : null}
      {p.actividad ? (
        <View style={styles.postPie}>
          <View style={[styles.postActividad, t.esTipo && { backgroundColor: t.clarito, borderColor: t.color }]}>
            <Text style={[styles.postActividadTexto, { color: t.esTipo ? colores.tintaFija : colores.tinta }]} numberOfLines={1}>
              {p.actividad.titulo} · {fecha.dia} {fecha.mes.toLowerCase()}
            </Text>
          </View>
          <Text style={styles.postParticipantes}>
            {p.participantes} {p.participantes === 1 ? 'voluntario participó' : 'voluntarios participaron'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Fotos({ fotos, onFoto }) {
  const Foto = ({ ruta, estilo, mas }) => (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel="Ver foto" onPress={() => onFoto(ruta)} style={estilo}>
      <ImagenApi ruta={ruta} estilo={{ width: '100%', height: '100%' }} />
      {mas ? (
        <View style={styles.fotoMas}>
          <Text style={styles.fotoMasTexto}>+{mas}</Text>
        </View>
      ) : null}
    </Pressable>
  );
  if (fotos.length === 1) return <Foto ruta={fotos[0]} estilo={{ height: 280 }} />;
  if (fotos.length === 2) {
    return (
      <View style={[styles.fotosFila, { height: 220 }]}>
        <Foto ruta={fotos[0]} estilo={{ flex: 1 }} />
        <Foto ruta={fotos[1]} estilo={{ flex: 1 }} />
      </View>
    );
  }
  return (
    <View style={{ gap: 3 }}>
      <Foto ruta={fotos[0]} estilo={{ height: 230 }} />
      <View style={[styles.fotosFila, { height: 130 }]}>
        <Foto ruta={fotos[1]} estilo={{ flex: 1 }} />
        <Foto ruta={fotos[2]} estilo={{ flex: 1 }} mas={fotos.length > 3 ? fotos.length - 3 : 0} />
      </View>
    </View>
  );
}

/** Portada por defecto (si la organización no subió una): una playa con voluntarios, con los colores de la marca. */
function PortadaDibujo() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 170" preserveAspectRatio="xMidYMid slice">
      <Rect width="390" height="170" fill="#CFE8F2" />
      <Circle cx="310" cy="62" r="30" fill="#F9C386" />
      <Path d="M0 104 Q24 94 49 104 T98 104 T146 104 T195 104 T244 104 T292 104 T341 104 T390 104 V170 H0Z" fill="#FFFFFF" />
      <Path d="M0 118 Q49 106 98 118 T195 118 T292 118 T390 118 V170 H0Z" fill="#F9C386" />
      <Circle cx="150" cy="132" r="9" fill="#E763A5" />
      <Rect x="146" y="140" width="8" height="22" rx="4" fill="#073B4C" />
      <Circle cx="190" cy="128" r="9" fill="#B7D665" />
      <Rect x="186" y="136" width="8" height="26" rx="4" fill="#073B4C" />
      <Circle cx="232" cy="134" r="8" fill="#F8D3E5" />
      <Rect x="228" y="141" width="8" height="21" rx="4" fill="#073B4C" />
    </Svg>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  relleno: { paddingHorizontal: espacio.xl },
  portada: { height: 170, backgroundColor: colores.pista },
  portadaImagen: { width: '100%', height: '100%' },
  portadaBotones: { position: 'absolute', left: espacio.l, right: espacio.l, flexDirection: 'row', justifyContent: 'space-between' },
  botonVidrio: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  logoAro: { alignSelf: 'flex-start', marginTop: -40, borderWidth: 4, borderColor: colores.crema, borderRadius: 30 },
  logo: { width: 80, height: 80, borderRadius: 26 },
  logoVacio: { backgroundColor: colores.coral, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fuentes.negrita, fontSize: 21, color: colores.tinta, marginTop: espacio.s, letterSpacing: -0.3 },
  rubro: { fontFamily: fuentes.texto, fontSize: 13, color: colores.tintaSuave, marginTop: 3 },
  descripcion: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.tinta, marginTop: espacio.s },
  descripcionVacia: { fontFamily: fuentes.texto, fontSize: 13.5, lineHeight: 19, color: colores.tintaSuave, marginTop: espacio.s, fontStyle: 'italic' },
  coordinan: { fontFamily: fuentes.texto, fontSize: 13, color: colores.tintaSuave, marginTop: espacio.s },
  coordinanNombres: { fontFamily: fuentes.negrita, color: colores.tinta },
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: espacio.m, marginBottom: espacio.s },

  aviso: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.sol, borderRadius: 20, padding: 12, paddingLeft: 14, marginTop: espacio.s, marginBottom: espacio.s },
  avisoTitulo: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.tintaFija },
  avisoTexto: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaFija, marginTop: 2 },
  avisoBoton: { backgroundColor: colores.tintaFija, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  avisoBotonTexto: { fontFamily: fuentes.negrita, fontSize: 13, color: '#FFFFFF' },

  separadorFeed: { height: 8, backgroundColor: colores.pista, marginTop: espacio.m },
  seccion: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta, marginTop: espacio.l },
  ayuda: { fontFamily: fuentes.texto, fontSize: 13, color: colores.tintaSuave, marginTop: 2, marginBottom: espacio.m },

  proxima: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 20, padding: 10, paddingRight: 14, marginHorizontal: espacio.xl, marginBottom: 8 },
  proximaFecha: { width: 50, height: 50, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  proximaDia: { fontFamily: fuentes.numero, fontSize: 19, lineHeight: 21, color: colores.tinta },
  proximaMes: { fontFamily: fuentes.negrita, fontSize: 10, color: colores.tintaSuave },
  proximaTitulo: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  proximaHora: { fontFamily: fuentes.texto, fontSize: 12.5, color: colores.tintaSuave, marginTop: 2 },

  post: { backgroundColor: colores.tarjeta, marginBottom: 8 },
  postCabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  postLogo: { width: 40, height: 40, borderRadius: 13 },
  postOrg: { fontFamily: fuentes.negrita, fontSize: 14, color: colores.tinta },
  postMeta: { fontFamily: fuentes.texto, fontSize: 12, color: colores.tintaSuave },
  postTexto: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.tinta, marginHorizontal: 16, marginTop: 10, marginBottom: 12 },
  fotosFila: { flexDirection: 'row', gap: 3 },
  fotoMas: { ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, backgroundColor: 'rgba(7,59,76,0.55)', alignItems: 'center', justifyContent: 'center' },
  fotoMasTexto: { fontFamily: fuentes.negrita, fontSize: 22, color: '#FFFFFF' },
  postPie: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 10 },
  postActividad: { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: colores.borde, backgroundColor: colores.crema, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, maxWidth: '100%' },
  postActividadTexto: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.tintaFija },
  postParticipantes: { fontFamily: fuentes.semi, fontSize: 13, color: colores.tintaSuave, borderTopWidth: 1, borderTopColor: colores.linea, paddingTop: 10 },
}));
