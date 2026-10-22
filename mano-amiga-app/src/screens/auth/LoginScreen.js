import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pantalla from '../../components/Pantalla';
import { Boton, Campo, MensajeError } from '../../components/ui';
import { LogoAnimado } from '../../components/Logo';
import { useAuth } from '../../hooks/useAuth';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes, sombra } from '../../constants/tema';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const ingresar = async () => {
    if (!email || !password) return setError('Completá email y contraseña');
    setEnviando(true);
    setError(null);
    try {
      await login(email, password);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Pantalla estilo={{ paddingTop: insets.top }}>
      <View style={styles.marca}>
        <LogoAnimado tamano={112} />
        <Text style={styles.lema}>Sumate, ayudá y hacé que cada hora cuente</Text>
      </View>

      <View style={styles.formulario}>
        <MensajeError texto={error} />
        <Campo etiqueta="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="tu@email.com" />
        <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" />
        <Boton titulo="Entrar" onPress={ingresar} cargando={enviando} />
        <Boton titulo="Quiero sumarme" variante="sol" onPress={() => navigation.navigate('Registro')} />
      </View>
    </Pantalla>
  );
}

const styles = estilosDinamicos(() => ({
  marca: { alignItems: 'center', marginTop: espacio.xxl, marginBottom: espacio.xl },
  lema: { fontFamily: fuentes.textoMedio, color: colores.tintaSuave, marginTop: espacio.s, textAlign: 'center', fontSize: 15 },
  formulario: { backgroundColor: colores.tarjeta, borderRadius: 24, padding: espacio.l, borderWidth: 1, borderColor: colores.borde, ...sombra },
}));
