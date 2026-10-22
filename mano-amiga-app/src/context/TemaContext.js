import { createContext, Fragment, useCallback, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { aplicarPaleta } from '../constants/tema';

/**
 * Tema claro / oscuro (R16 · preferencias del perfil).
 *
 * La preferencia ("sistema" | "claro" | "oscuro") se guarda en el servidor, dentro del perfil
 * (PATCH /usuarios/me), así se mantiene al cambiar de celular. Sin sesión se sigue al sistema.
 *
 * Cuando cambia el modo:
 *  1. se copia la paleta nueva en "colores" (aplicarPaleta),
 *  2. se vuelve a montar el árbol de pantallas (key={modo}) para que todo se redibuje.
 *     El RootNavigator guarda el estado de la navegación, así que la persona queda en la misma pantalla.
 */
export const TemaContext = createContext({ modo: 'claro', preferencia: 'sistema', setPreferenciaLocal: () => {} });

export function TemaProvider({ children }) {
  const { usuario } = useAuth();
  const sistema = useColorScheme();
  // Mientras se guarda en el servidor, la elección se aplica igual (respuesta inmediata).
  const [preferenciaLocal, setPreferenciaLocal] = useState(null);

  const preferencia = preferenciaLocal || usuario?.preferencias?.tema || 'sistema';
  const modo = preferencia === 'sistema' ? (sistema === 'dark' ? 'oscuro' : 'claro') : preferencia;
  aplicarPaleta(modo); // idempotente: solo hace algo si el modo cambió

  const limpiar = useCallback(() => setPreferenciaLocal(null), []);
  const valor = useMemo(() => ({ modo, preferencia, setPreferenciaLocal, limpiarPreferenciaLocal: limpiar }), [modo, preferencia, limpiar]);

  return (
    <TemaContext.Provider value={valor}>
      <Fragment key={modo}>{children}</Fragment>
    </TemaContext.Provider>
  );
}
