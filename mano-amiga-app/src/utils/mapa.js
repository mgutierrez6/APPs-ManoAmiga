import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/*
 ¿Se puede mostrar un mapa acá?
 En el APK de Android el mapa es de Google y necesita una clave (GOOGLE_MAPS_API_KEY), que pide cargar una
 tarjeta. Sin clave, abrirlo cierra la app: por eso ahí se muestra una lista de lugares con "Cómo llegar".
 En iPhone (Apple Maps) y en Expo Go el mapa funciona sin clave. Si algún día se agrega la clave, vuelve solo.
 */
const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const tieneClave = Boolean(Constants.expoConfig?.android?.config?.googleMaps?.apiKey);

export const hayMapa = Platform.OS !== 'android' || esExpoGo || tieneClave;
