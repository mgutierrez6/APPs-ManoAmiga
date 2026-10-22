import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, View } from 'react-native';
import { Boton, Campo, TextoSuave } from '../components/ui';
import { LogoMarca } from '../components/Logo';
import { api, mensajeDeError, onSolicitarReauth } from '../api/client';
import { colores, espacio, estilosDinamicos, fuentes, sombra } from '../constants/tema';

/**
 * RS9 · Modal "Confirmá tu contraseña".
 * El cliente HTTP (conReauth) lo abre cuando la API responde 403 REAUTH_REQUERIDA.
 * La contraseña va directo a POST /auth/reauth y no se guarda en ningún lado.
 */
export function ReauthProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const pendiente = useRef(null); // { resolve, reject }

  useEffect(() => {
    onSolicitarReauth(
      () =>
        new Promise((resolve, reject) => {
          pendiente.current = { resolve, reject };
          setPassword('');
          setError(null);
          setVisible(true);
        })
    );
    return () => onSolicitarReauth(null);
  }, []);

  const cancelar = useCallback(() => {
    setVisible(false);
    const e = new Error('cancelado');
    e.cancelado = true;
    pendiente.current?.reject(e);
    pendiente.current = null;
  }, []);

  const confirmar = useCallback(async () => {
    if (!password) return setError('Ingresá tu contraseña');
    setEnviando(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/reauth', { password });
      setVisible(false);
      setPassword('');
      pendiente.current?.resolve(data);
      pendiente.current = null;
    } catch (e) {
      setError(e?.response?.status === 401 ? 'Contraseña incorrecta' : mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }, [password]);

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={cancelar}>
        <KeyboardAvoidingView style={styles.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.caja}>
            <View style={styles.marca}><LogoMarca tamano={44} /></View>
            <Text style={styles.titulo}>Confirmá que sos vos</Text>
            <TextoSuave estilo={styles.centro}>Esta acción de administración necesita tu contraseña. Vale por 5 minutos.</TextoSuave>
            <Campo
              etiqueta="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              error={error}
              onSubmitEditing={confirmar}
            />
            <Boton titulo="Confirmar" onPress={confirmar} cargando={enviando} />
            <Boton titulo="Cancelar" variante="borde" onPress={cancelar} deshabilitado={enviando} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = estilosDinamicos(() => ({
  fondo: { flex: 1, backgroundColor: 'rgba(7,59,76,0.55)', justifyContent: 'center', padding: espacio.l },
  caja: { backgroundColor: colores.tarjeta, borderRadius: 28, padding: espacio.l, ...sombra },
  marca: { alignItems: 'center', marginBottom: 4 },
  titulo: { fontFamily: fuentes.titulo, fontSize: 22, color: colores.tinta, textAlign: 'center', marginVertical: espacio.s },
  centro: { textAlign: 'center', marginBottom: espacio.m },
}));
