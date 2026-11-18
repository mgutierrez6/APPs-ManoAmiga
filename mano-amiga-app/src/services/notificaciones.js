import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registrarPushToken } from '../api/usuarios';

/**
 * Pide permiso y registra el token de notificaciones push en la API.
 *
 * IMPORTANTE: en Expo Go las notificaciones push remotas NO están disponibles (Android las quitó en el SDK 53).
 * Para probarlas hace falta un "development build" con EAS y el projectId de EAS (Sprint 2).
 * Por eso, dentro de Expo Go esta función no hace nada y la app funciona igual.
 */
/** ¿Se pueden usar notificaciones push acá? (no en Expo Go ni en el emulador web) */
function pushDisponible() {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && Platform.OS !== 'web';
}

/**
 * Escucha las notificaciones push:
 *  - alTocar(data): la persona tocó una notificación (también si la app estaba cerrada y se abrió con ella).
 *  - alRecibir(data): llegó una notificación con la app abierta.
 * Devuelve una función para dejar de escuchar. En Expo Go no hace nada.
 */
export function escucharNotificaciones({ alTocar, alRecibir }) {
  if (!pushDisponible()) return () => {};
  try {
    const Notifications = require('expo-notifications');
    const toque = Notifications.addNotificationResponseReceivedListener((r) => alTocar?.(r.notification.request.content.data));
    const llegada = Notifications.addNotificationReceivedListener((n) => alRecibir?.(n.request.content.data));
    // La app estaba cerrada y se abrió tocando una notificación.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) {
          alTocar?.(r.notification.request.content.data);
          Notifications.clearLastNotificationResponseAsync?.();
        }
      })
      .catch(() => {});
    return () => {
      toque.remove();
      llegada.remove();
    };
  } catch {
    return () => {};
  }
}

export async function registrarNotificaciones() {
  try {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null; // Expo Go
    if (!Device.isDevice) return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;

    // Se carga recién acá para no inicializar el módulo dentro de Expo Go.
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mano Amiga',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registrarPushToken(token);
    return token;
  } catch (e) {
    return null;
  }
}
