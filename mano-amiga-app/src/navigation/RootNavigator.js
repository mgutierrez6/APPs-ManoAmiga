import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
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
import MisInscripcionesScreen from '../screens/inscripciones/MisInscripcionesScreen';
import EscanearQRScreen from '../screens/inscripciones/EscanearQRScreen';
import CampanasScreen from '../screens/comunidad/CampanasScreen';
import FeedScreen from '../screens/comunidad/FeedScreen';
import PublicarScreen from '../screens/comunidad/PublicarScreen';
import CrearCampanaScreen from '../screens/comunidad/CrearCampanaScreen';
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

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

// Opciones que dependen del tema: son funciones para leer los colores actuales (claro u oscuro).
// Encabezados de las pantallas internas: fondo crema, sin línea, título con la tipografía de la marca.
const opcionesStack = () => ({
  headerTintColor: colores.tinta,
  headerBackButtonDisplayMode: 'minimal',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colores.crema },
  headerTitleStyle: { fontFamily: fuentes.titulo, fontSize: 20, color: colores.tinta },
  contentStyle: { backgroundColor: colores.crema },
});

// Las pestañas no muestran encabezado: cada pantalla tiene su propio "Hero" de color.
const opcionesTabs = () => ({ headerShown: false, sceneStyle: { backgroundColor: colores.crema } });
const barra = (props) => <BarraPestanas {...props} />;

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
function VoluntarioTabs() {
  return (
    <Tabs.Navigator screenOptions={opcionesTabs()} tabBar={barra}>
      <Tabs.Screen name="Actividades" component={ActividadesScreen} options={{ title: 'Actividades', tabBarIcono: 'actividades' }} />
      <Tabs.Screen name="Mapa" component={MapaScreen} options={{ title: 'Mapa', tabBarIcono: 'mapa' }} />
      <Tabs.Screen name="Campanas" component={CampanasScreen} options={{ title: 'Campañas', tabBarIcono: 'campanas' }} />
      <Tabs.Screen name="MisInscripciones" component={MisInscripcionesScreen} options={{ title: 'Inscripciones', tabBarIcono: 'inscripciones' }} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil', tabBarIcono: 'perfil' }} />
    </Tabs.Navigator>
  );
}

// ---------- Coordinador ----------
function CoordinadorTabs() {
  return (
    <Tabs.Navigator screenOptions={opcionesTabs()} tabBar={barra}>
      <Tabs.Screen name="MisActividades" component={MisActividadesScreen} options={{ title: 'Mis actividades', tabBarIcono: 'carpeta' }} />
      <Tabs.Screen name="Campanas" component={CampanasScreen} options={{ title: 'Campañas', tabBarIcono: 'campanas' }} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil', tabBarIcono: 'perfil' }} />
    </Tabs.Navigator>
  );
}

// ---------- Administrador (Sprint 2) ----------
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
      <Stack.Screen name="ActividadDetalle" component={ActividadDetalleScreen} options={{ title: 'Actividad' }} />
      <Stack.Screen name="Feed" component={FeedScreen} options={{ title: 'Comunidad' }} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} options={{ title: 'Mis datos' }} />
      <Stack.Screen name="CambiarPassword" component={CambiarPasswordScreen} options={{ title: 'Cambiar contraseña' }} />
      <Stack.Screen name="Accesos" component={AccesosScreen} options={{ title: 'Historial de accesos' }} />
      {rol === 'voluntario' ? <Stack.Screen name="EscanearQR" component={EscanearQRScreen} options={{ title: 'Marcar asistencia' }} /> : null}
      {rol === 'coordinador' ? (
        <>
          <Stack.Screen name="ActividadForm" component={ActividadFormScreen} options={{ title: 'Actividad' }} />
          <Stack.Screen name="GestionActividad" component={GestionActividadScreen} options={{ title: 'Gestionar actividad' }} />
          <Stack.Screen name="MostrarQR" component={MostrarQRScreen} options={{ title: 'QR de asistencia' }} />
          <Stack.Screen name="Publicar" component={PublicarScreen} options={{ title: 'Nueva publicación' }} />
          <Stack.Screen name="CrearCampana" component={CrearCampanaScreen} options={{ title: 'Nueva campaña' }} />
        </>
      ) : null}
    </Stack.Navigator>
  );
}

// Al cambiar de tema el árbol se vuelve a montar (TemaContext). Guardamos el estado de la navegación
// para que la persona siga en la misma pantalla. Se descarta al cambiar de usuario o de rol.
let navegacionGuardada = { clave: null, estado: undefined };

export default function RootNavigator() {
  const { usuario, cargando } = useAuth();
  const { modo } = useTema();
  if (cargando) return <Cargando />;
  const clave = usuario ? `${usuario.id}:${usuario.rol}` : 'anonimo';
  const inicial = navegacionGuardada.clave === clave ? navegacionGuardada.estado : undefined;
  return (
    <NavigationContainer
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
