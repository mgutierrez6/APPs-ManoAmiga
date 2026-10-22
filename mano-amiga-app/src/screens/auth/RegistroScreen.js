import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Pantalla from '../../components/Pantalla';
import Hero from '../../components/Hero';
import { Boton, Campo, MensajeError, Tarjeta, TextoSuave } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { mensajeDeError } from '../../api/client';
import { colores, estilosDinamicos, fuentes } from '../../constants/tema';

// El registro crea SIEMPRE un voluntario (el rol lo decide la API, no la app).
export default function RegistroScreen({ navigation }) {
  const { registrar } = useAuth();
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '', repetir: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const enviar = async () => {
    if (!form.nombre || !form.apellido || !form.email || !form.password) return setError('Completá los campos obligatorios');
    if (form.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (form.password !== form.repetir) return setError('Las contraseñas no coinciden');
    setEnviando(true);
    setError(null);
    try {
      const { repetir, ...datos } = form;
      await registrar({ ...datos, email: datos.email.trim() });
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Pantalla
      cabecera={
        <Hero titulo="¡Sumate a la red!" subtitulo="En un minuto ya podés anotarte a tu primera actividad" tema="lila" figuras={1}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.volver}>← Ya tengo cuenta</Text>
          </Pressable>
        </Hero>
      }
    >
      <MensajeError texto={error} />
      <Tarjeta>
        <Campo etiqueta="Nombre *" value={form.nombre} onChangeText={set('nombre')} autoComplete="given-name" />
        <Campo etiqueta="Apellido *" value={form.apellido} onChangeText={set('apellido')} autoComplete="family-name" />
        <Campo etiqueta="Email *" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Campo etiqueta="Teléfono" value={form.telefono} onChangeText={set('telefono')} keyboardType="phone-pad" autoComplete="tel" />
        <Campo etiqueta="Contraseña * (mínimo 8 caracteres)" value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" />
        <Campo etiqueta="Repetir contraseña *" value={form.repetir} onChangeText={set('repetir')} secureTextEntry />
        <TextoSuave estilo={{ marginBottom: 8 }}>Tu teléfono y apellido solo los ven los coordinadores de las actividades en las que te inscribas.</TextoSuave>
        <Boton titulo="Crear mi cuenta" onPress={enviar} cargando={enviando} />
      </Tarjeta>
    </Pantalla>
  );
}

const styles = estilosDinamicos(() => ({
  volver: { fontFamily: fuentes.negrita, color: colores.blanco, fontSize: 15 },
}));
