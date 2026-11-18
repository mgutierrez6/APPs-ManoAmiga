import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { escucharNotificaciones } from '../services/notificaciones';
import { hayMapa } from '../utils/mapa';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { Cargando } from '../components/ui';
import BarraPestanas from '../components/BarraPestanas';
import { colores, fuentes } from '../constants/tema';
import { useTema } from '../hooks/useTema';

import LoginScreen from '../screens/auth/LoginScreen';
import RegistroScreen from '../screens/auth/RegistroScreen';
import ActividadesScreen from '../screens/actividades/ActividadesScreen';
import ActividadDetalleScreen from '../screens/actividades/ActividadDetalleScreen';
import InscripcionListaScreen from '../screens/actividades/InscripcionListaScreen';
import MisInscripcionesScreen from '../screens/inscripciones/MisInscripcionesScreen';
import EscanearQRScreen from '../screens/inscripciones/EscanearQRScreen';
import CalendarioScreen from '../screens/calendario/CalendarioScreen';
import CampanasScreen from '../screens/comunidad/CampanasScreen';
import FeedScreen from '../screens/comunidad/FeedScreen';
import PublicarScreen from '../screens/comunidad/PublicarScreen';
import CrearCampanaScreen from '../screens/comunidad/CrearCampanaScreen';
import OrganizacionScreen from '../screens/organizacion/OrganizacionScreen';
import EditarOrganizacionScreen from '../screens/organizacion/EditarOrganizacionScreen';
import NuevaPublicacionScreen from '../screens/organizacion/NuevaPublicacionScreen';
import MiHistoriaScreen from '../screens/historia/MiHistoriaScreen';
import HistoriasPendientesScreen from '../screens/historia/HistoriasPendientesScreen';
import ContarHistoriaScreen from '../screens/historia/ContarHistoriaScreen';
import MisActividadesScreen from '../screens/coordinador/MisActividadesScreen';
import ActividadFormScreen from '../screens/coordinador/ActividadFormScreen';
import GestionActividadScreen from '../screens/coordinador/GestionActividadScreen';
import MostrarQRScreen from '../screens/coordinador/MostrarQRScreen';
import PerfilScreen from '../screens/perfil/PerfilScreen';
import EditarPerfilScreen from '../screens/perfil/EditarPerfilScreen';
import CambiarPasswordScreen from '../screens/perfil/CambiarPasswordScreen';
import AccesosScreen from '../screens/perfil/AccesosScreen';
import MapaScreen from '../screens/mapa/MapaScreen';
import AdminOrganizacionesScreen from '../screens/admin/AdminOrganizacionesScreen';
import AdminUsuariosScreen from '../screens/admin/AdminUsuariosScreen';
import AdminJudicialesScreen from '../screens/admin/AdminJudicialesScreen';
import AdminAuditoriaScreen from '../screens/admin/AdminAuditoriaScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import AvisosScreen from '../screens/avisos/AvisosScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

// Opciones que dependen del tema: son funciones para leer los colores actuales (claro u oscuro).
// Encabezados de las pantallas internas: fondo crema, sin línea, título con la letra de la marca.
const opcionesStack = () => ({
  headerTintColor: colores.tinta,
  headerBackButtonDisplayMode: 'minimal',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colores.crema },
  headerTitleStyle: { fontFamily: fuentes.tituloMedio, fontSize: 18, color: colores.tinta },
  contentStyle: { backgroundColor: colores.crema },
});

// Las pestañas no muestran encabezado: cada pantalla tiene su propio título grande.
const opcionesTabs = () => ({ headerShown: false, sceneStyle: { backgroundColor: colores.crema } });
const barra = (props) => <BarraPestanas {...props} />;
// Pantallas internas con su propio encabezado de diseño (sin la barra de arriba).
const sinEncabezado = { headerShown: false };

function temaNavegacion(modo) {
  const base = modo === 'oscuro' ? DarkTheme : DefaultTheme;
  return { ...base, colors: { ...base.colors, background: colores.crema, card: colores.crema, primary: colores.coral, text: colores.tinta, border: colores.borde } };
}

// ---------- Sin sesión ----------
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={opcionesStack()}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Registro" component={RegistroScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ---------- Voluntario ----------
// Las campañas de donación no están en el menú: se entra desde una card en Actividades.
function VoluntarioTabs() {
  return (
    <Tabs.Navigator screenOptions={opcionesTabs()} tabBar={barra}>
      <Tabs.Screen name="Actividades" component={ActividadesScreen} options={{ title: 'Actividades', tabBarIcono: 'estrella' }} />
      <Tabs.Screen name="Mapa" component={MapaScreen} options={{ title: hayMapa ? 'Mapa' : 'Lugares', tabBarIcono: 'mapa' }} />
      <Tabs.Screen name="MisInscripciones" component={MisInscripcionesScreen} options={{ title: 'Inscripciones', tabBarIcono: 'inscripciones' }} />
      <Tabs.Screen name="Calendario" component={CalendarioScreen} options={{ title: 'Calendario', tabBarIcono: 'calendario' }} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil', tabBarIcono: 'perfil' }} />
    </Tabs.Navigator>
  );
}

// ---------- Coordinador ----------
// "Organización" abre el perfil de SU organización (la toma del token). Campañas de donación tiene su propia pestaña.
function CoordinadorTabs() {
  return (
    <Tabs.Navigator screenOptions={opcionesTabs()} tabBar={barra}>
      <Tabs.Screen name="MisActividades" component={MisActividadesScreen} options={{ title: 'Mis actividades', tabBarIcono: 'carpeta' }} />
      <Tabs.Screen name="Calendario" component={CalendarioScreen} options={{ title: 'Calendario', tabBarIcono: 'calendario' }} />
      <Tabs.Screen name="CampanasCoord" component={CampanasScreen} options={{ title: 'Campañas', tabBarIcono: 'corazon' }} />
      <Tabs.Screen name="MiOrganizacion" component={OrganizacionScreen} options={{ title: 'Organización', tabBarIcono: 'organizaciones' }} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Mi perfil', tabBarIcono: 'perfil' }} />
    </Tabs.Navigator>
  );
}

// ---------- Administrador ----------
function AdminTabs() {
  return (
    <Tabs.Navigator screenOptions={opcionesTabs()} tabBar={barra}>
      <Tabs.Screen name="AdminOrganizaciones" component={AdminOrganizacionesScreen} options={{ title: 'Organizaciones', tabBarIcono: 'organizaciones' }} />
      <Tabs.Screen name="AdminUsuarios" component={AdminUsuariosScreen} options={{ title: 'Usuarios', tabBarIcono: 'usuarios' }} />
      <Tabs.Screen name="AdminJudiciales" component={AdminJudicialesScreen} options={{ title: 'Judiciales', tabBarIcono: 'judiciales' }} />
      <Tabs.Screen name="AdminAuditoria" component={AdminAuditoriaScreen} options={{ title: 'Auditoría', tabBarIcono: 'auditoria' }} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil', tabBarIcono: 'perfil' }} />
    </Tabs.Navigator>
  );
}

const TABS_POR_ROL = { voluntario: VoluntarioTabs, coordinador: CoordinadorTabs, admin: AdminTabs };

// Las pantallas visibles cambian según el rol SOLO por comodidad: la API valida todo (RS4).
function AppStack({ rol }) {
  const Inicio = TABS_POR_ROL[rol] || VoluntarioTabs;
  return (
    <Stack.Navigator screenOptions={opcionesStack()}>
      <Stack.Screen name="Inicio" component={Inicio} options={{ headerShown: false }} />
      <Stack.Screen name="ActividadDetalle" component={ActividadDetalleScreen} options={sinEncabezado} />
      <Stack.Screen name="Organizacion" component={OrganizacionScreen} options={sinEncabezado} />
      <Stack.Screen name="Campanas" component={CampanasScreen} options={sinEncabezado} />
      <Stack.Screen name="Feed" component={FeedScreen} options={{ title: 'Novedades' }} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} options={{ title: 'Mis datos' }} />
      <Stack.Screen name="CambiarPassword" component={CambiarPasswordScreen} options={{ title: 'Cambiar contraseña' }} />
      <Stack.Screen name="Accesos" component={AccesosScreen} options={{ title: 'Historial de accesos' }} />
      <Stack.Screen name="Avisos" component={AvisosScreen} options={{ title: 'Avisos' }} />
      {rol === 'voluntario' || rol === 'coordinador' ? <Stack.Screen name="Chat" component={ChatScreen} options={sinEncabezado} /> : null}
      {rol === 'voluntario' ? (
        <>
          <Stack.Screen name="EscanearQR" component={EscanearQRScreen} options={{ title: 'Marcar asistencia' }} />
          <Stack.Screen name="InscripcionLista" component={InscripcionListaScreen} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="MiHistoria" component={MiHistoriaScreen} options={sinEncabezado} />
          <Stack.Screen name="HistoriasPendientes" component={HistoriasPendientesScreen} options={sinEncabezado} />
          <Stack.Screen name="ContarHistoria" component={ContarHistoriaScreen} options={{ ...sinEncabezado, presentation: 'modal' }} />
        </>
      ) : null}
      {rol === 'coordinador' ? (
        <>
          <Stack.Screen name="ActividadForm" component={ActividadFormScreen} options={{ title: 'Actividad' }} />
          <Stack.Screen name="GestionActividad" component={GestionActividadScreen} options={sinEncabezado} />
          <Stack.Screen name="MostrarQR" component={MostrarQRScreen} options={{ title: 'QR de asistencia' }} />
          <Stack.Screen name="Publicar" component={PublicarScreen} options={{ title: 'Nueva novedad' }} />
          <Stack.Screen name="CrearCampana" component={CrearCampanaScreen} options={{ title: 'Nueva campaña' }} />
          <Stack.Screen name="EditarOrganizacion" component={EditarOrganizacionScreen} options={{ title: 'Editar perfil' }} />
          <Stack.Screen name="NuevaPublicacion" component={NuevaPublicacionScreen} options={{ title: 'Nueva publicación', presentation: 'modal' }} />
        </>
      ) : null}
    </Stack.Navigator>
  );
}

// Al cambiar de tema el árbol se vuelve a montar (TemaContext). Guardamos el estado de la navegación
// para que la persona siga en la misma pantalla. Se descarta al cambiar de usuario o de rol.
let navegacionGuardada = { clave: null, estado: undefined };

// Para poder navegar desde fuera de una pantalla (al tocar una notificación push).
export const navegacion = createNavigationContainerRef();

/** Pantalla a la que lleva una notificación, según lo que manda la API en "data" (igual que en la lista de avisos). */
function abrirDesdeNotificacion(data, rol) {
  if (!data || !navegacion.isReady()) return false;
  const { tipo, actividadId } = data;
  if (tipo === 'chat' && actividadId) navegacion.navigate('Chat', { id: actividadId });
  else if (tipo === 'novedad' && actividadId) navegacion.navigate('Feed', { proyectoId: actividadId });
  else if (actividadId && rol === 'voluntario' && tipo !== 'actividad_cancelada') navegacion.navigate('ActividadDetalle', { id: actividadId });
  else navegacion.navigate('Avisos');
  return true;
}

export default function RootNavigator() {
  const { usuario, cargando } = useAuth();
  const { modo } = useTema();
  const pendiente = useRef(null); // notificación tocada antes de que la navegación esté lista

  // Al tocar una notificación push (con la app abierta, en segundo plano o cerrada) se abre su pantalla.
  useEffect(() => {
    if (!usuario) return undefined;
    return escucharNotificaciones({
      alTocar: (data) => {
        if (!abrirDesdeNotificacion(data, usuario.rol)) pendiente.current = data;
      },
      alRecibir: () => DeviceEventEmitter.emit('avisos:actualizar'), // la campanita se actualiza al momento
    });
  }, [usuario]);

  if (cargando) return <Cargando />;
  const clave = usuario ? `${usuario.id}:${usuario.rol}` : 'anonimo';
  const inicial = navegacionGuardada.clave === clave ? navegacionGuardada.estado : undefined;
  return (
    <NavigationContainer
      ref={navegacion}
      onReady={() => {
        if (pendiente.current && usuario) {
          abrirDesdeNotificacion(pendiente.current, usuario.rol);
          pendiente.current = null;
        }
      }}
      theme={temaNavegacion(modo)}
      initialState={inicial}
      onStateChange={(estado) => {
        navegacionGuardada = { clave, estado };
      }}
    >
      {usuario ? <AppStack rol={usuario.rol} /> : <AuthStack />}
    </NavigationContainer>
  );
}
