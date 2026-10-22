import { useState } from 'react';
import Pantalla from '../../components/Pantalla';
import { Boton, Campo, MensajeError, TextoSuave } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { actualizarPerfil } from '../../api/usuarios';
import { mensajeDeError } from '../../api/client';

/**
 * Editar datos de contacto (R8). Solo se mandan nombre, apellido y teléfono: el email, el rol y la
 * condición judicial NO se pueden cambiar desde acá (la API igual descarta cualquier otro campo).
 */
export default function EditarPerfilScreen({ route, navigation }) {
  const inicial = route.params?.perfil || {};
  const { actualizarUsuario } = useAuth();
  const [nombre, setNombre] = useState(inicial.nombre || '');
  const [apellido, setApellido] = useState(inicial.apellido || '');
  const [telefono, setTelefono] = useState(inicial.telefono || '');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const validar = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = 'Ingresá tu nombre';
    if (!apellido.trim()) e.apellido = 'Ingresá tu apellido';
    if (telefono.trim() && !/^\+?[0-9 ]{6,20}$/.test(telefono.trim())) e.telefono = 'Solo números (y espacios), entre 6 y 20';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    setError(null);
    try {
      const p = await actualizarPerfil({ nombre: nombre.trim(), apellido: apellido.trim(), telefono: telefono.trim() });
      actualizarUsuario({ nombre: p.nombre });
      navigation.goBack();
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Pantalla>
      <TextoSuave estilo={{ marginBottom: 16 }}>Tu email es tu usuario y no se puede cambiar.</TextoSuave>
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} error={errores.nombre} maxLength={60} />
      <Campo etiqueta="Apellido" value={apellido} onChangeText={setApellido} error={errores.apellido} maxLength={60} />
      <Campo etiqueta="Teléfono" value={telefono} onChangeText={setTelefono} error={errores.telefono} keyboardType="phone-pad" maxLength={20} />
      <MensajeError texto={error} />
      <Boton titulo="Guardar cambios" onPress={guardar} cargando={guardando} />
    </Pantalla>
  );
}
