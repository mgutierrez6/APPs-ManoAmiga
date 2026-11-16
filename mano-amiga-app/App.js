import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Se importa cada grosor por separado: así el APK solo lleva las fuentes que se usan.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { AuthProvider } from './src/context/AuthContext';
import { TemaProvider } from './src/context/TemaContext';
import { ReauthProvider } from './src/context/ReauthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useTema } from './src/hooks/useTema';
import { colores } from './src/constants/tema';

/* App.js monta los contextos y el RootNavigator (6.1):
    AuthProvider (sesión) → TemaProvider (claro/oscuro, lee la preferencia del usuario)
    → ReauthProvider (modal de contraseña para acciones del admin, RS9) → navegación.

 Fuentes: Pearl Jean (títulos grandes), Bricolage Grotesque (números y subtítulos) e Inter (texto).
 */
export default function App() {
  const [fuentesListas] = useFonts({
    PearlJean: require('./assets/fonts/PearlJean.ttf'),
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fuentesListas) return <View style={{ flex: 1, backgroundColor: colores.crema }} />;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TemaProvider>
          <ReauthProvider>
            <RootNavigator />
            <BarraDeEstado />
          </ReauthProvider>
        </TemaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function BarraDeEstado() {
  const { modo } = useTema();
  return <StatusBar style={modo === 'oscuro' ? 'light' : 'dark'} />;
}
