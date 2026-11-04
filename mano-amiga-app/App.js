import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { AuthProvider } from './src/context/AuthContext';
import { TemaProvider } from './src/context/TemaContext';
import { ReauthProvider } from './src/context/ReauthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useTema } from './src/hooks/useTema';
import { colores } from './src/constants/tema';

/* App.js monta los contextos y el RootNavigator (6.1):
    AuthProvider (sesión) → TemaProvider (claro/oscuro, lee la preferencia del usuario)
    → ReauthProvider (modal de contraseña para acciones del admin, RS9) → navegación.
 */
export default function App() {
  const [fuentesListas] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Nunito_400Regular, Nunito_600SemiBold, Nunito_800ExtraBold });

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
