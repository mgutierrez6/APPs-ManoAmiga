import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { guardarSesion, limpiarSesion, onSesionExpirada, renovarSesion } from '../api/client';
import { registrarNotificaciones } from '../services/notificaciones';

/**
 * Estado global de la sesión (1.4): usuario, rol y funciones de login/logout.
 * Al abrir la app intenta restaurar la sesión con el refresh token guardado en SecureStore.
 *
 * OJO: el rol que se guarda acá es SOLO para decidir qué pantallas mostrar (comodidad).
 * La seguridad real la hace siempre la API (RS4).
 */
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cerrarLocal = useCallback(async () => {
    await limpiarSesion();
    setUsuario(null);
  }, []);

  useEffect(() => {
    // Si el refresh falla en cualquier pedido, volvemos al login.
    onSesionExpirada(() => setUsuario(null));

    (async () => {
      try {
        const data = await renovarSesion();
        setUsuario(data.usuario);
        registrarNotificaciones();
      } catch {
        await limpiarSesion();
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email.trim(), password);
    await guardarSesion(data);
    setUsuario(data.usuario);
    registrarNotificaciones();
  }, []);

  const registrar = useCallback(
    async (datos) => {
      await authApi.registrar(datos);
      await login(datos.email, datos.password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // aunque falle la red, cerramos la sesión en el celular
    }
    await cerrarLocal();
  }, [cerrarLocal]);

  /** Mezcla datos nuevos del usuario (ej.: después de editar el perfil o cambiar el tema). */
  const actualizarUsuario = useCallback((cambios) => {
    setUsuario((u) => (u ? { ...u, ...cambios, preferencias: { ...u.preferencias, ...(cambios.preferencias || {}) } } : u));
  }, []);

  /**
   * Reemplaza la sesión por una nueva (ej.: al cambiar la contraseña el servidor cierra TODAS las
   * sesiones -RS5- y devuelve tokens nuevos solo para este dispositivo).
   */
  const reemplazarSesion = useCallback(async (data) => {
    await guardarSesion(data);
    if (data.usuario) setUsuario(data.usuario);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, login, registrar, logout, actualizarUsuario, reemplazarSesion }),
    [usuario, cargando, login, registrar, logout, actualizarUsuario, reemplazarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
