// Configuración de Expo (6.1). No contiene secretos: la app se puede descompilar.
// La URL de la API va en el archivo .env de la app como EXPO_PUBLIC_API_URL.
// EAS_PROJECT_ID y GOOGLE_MAPS_API_KEY tampoco son secretos (quedan dentro del APK), pero dependen de
// la cuenta de cada equipo: se leen del .env (ver .env.example).
const easProjectId = process.env.EAS_PROJECT_ID;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: 'Mano Amiga',
    slug: 'mano-amiga',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic', // claro / oscuro según el sistema o la preferencia del perfil (Sprint 2)
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'uy.edu.um.manoamiga',
    },
    android: {
      package: 'uy.edu.um.manoamiga',
      // react-native-maps en Android usa Google Maps. En Expo Go no hace falta; en el APK sí.
      ...(googleMapsApiKey ? { config: { googleMaps: { apiKey: googleMapsApiKey } } } : {}),
      adaptiveIcon: {
        backgroundColor: '#FFF8EE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: { favicon: './assets/favicon.png' },
    plugins: [
      'expo-secure-store',
      'expo-sharing',
      '@react-native-community/datetimepicker',
      ['expo-camera', { cameraPermission: 'Mano Amiga usa la cámara para escanear el código QR de asistencia.', recordAudioAndroid: false }],
      'expo-notifications',
      [
        'expo-location',
        {
          // Solo "mientras se usa la app" y solo para centrar el mapa: la ubicación nunca se manda al servidor (RS7).
          locationWhenInUsePermission: 'Mano Amiga usa tu ubicación solo para mostrarte actividades cerca tuyo en el mapa. No se guarda ni se envía.',
        },
      ],
    ],
    // projectId de EAS: lo necesitan las notificaciones push (R9) y el build del APK. Se obtiene con "eas init".
    extra: easProjectId ? { eas: { projectId: easProjectId } } : {},
  },
};
