import { useState } from 'react';
import Pantalla from '../../components/Pantalla';
import { Boton, Campo, MensajeError, Tarjeta, TextoSuave } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { cambiarPassword } from '../../api/usuarios';
import { codigoDeError, mensajeDeError } from '../../api/client';
import { colores } from '../../constants/tema';

/**
 * Cambiar contraseña (R8 + RS5). Al confirmar, el servidor cierra TODAS las sesiones (si alguien
 * tenía tu cuenta abierta en otro celular, queda afuera al instante) y nos devuelve una sesión nueva
 * solo para este dispositivo.
 */
export default function CambiarPasswordScreen({ navigation }) {
  const { reemplazarSesion } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  const guardar = async () => {
    const e = {};
    if (!actual) e.actual = 'Ingresá tu contraseña actual';
    if (nueva.length < 8) e.nueva = 'Mínimo 8 caracteres';
    else if (nueva === actual) e.nueva = 'Tiene que ser distinta a la actual';
    if (repetir !== nueva) e.repetir = 'No coincide con la nueva contraseña';
    setErrores(e);
    if (Object.keys(e).length) return;

    setGuardando(true);
    setError(null);
    try {
      const sesion = await cambiarPassword(actual, nueva);
      await reemplazarSesion(sesion);
      setListo(true);
    } catch (err) {
      if (codigoDeError(err) === 'PASSWORD_ACTUAL_INCORRECTA') setErrores({ actual: 'La contraseña actual no es correcta' });
      else setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  if (listo) {
    return (
      <Pantalla>
        <Tarjeta acento={colores.menta}>
          <TextoSuave>Listo, tu contraseña se cambió. Cerramos la sesión en tus otros dispositivos por seguridad.</TextoSuave>
        </Tarjeta>
        <Boton titulo="Volver al perfil" onPress={() => navigation.goBack()} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Campo etiqueta="Contraseña actual" value={actual} onChangeText={setActual} secureTextEntry autoCapitalize="none" error={errores.actual} />
      <Campo etiqueta="Nueva contraseña" value={nueva} onChangeText={setNueva} secureTextEntry autoCapitalize="none" error={errores.nueva} maxLength={64} />
      <Campo etiqueta="Repetí la nueva" value={repetir} onChangeText={setRepetir} secureTextEntry autoCapitalize="none" error={errores.repetir} maxLength={64} />
      <TextoSuave estilo={{ marginBottom: 12 }}>Al cambiarla se cierran tus sesiones en otros dispositivos.</TextoSuave>
      <MensajeError texto={error} />
      <Boton titulo="Cambiar contraseña" onPress={guardar} cargando={guardando} />
    </Pantalla>
  );
}
