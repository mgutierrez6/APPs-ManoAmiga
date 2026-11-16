import { useState } from 'react';
import { Image, View } from 'react-native';
import { headersAuth, renovarSesion, urlApi } from '../api/client';
import { colores } from '../constants/tema';

/**
 * Foto guardada en la API (perfil, organización, publicaciones, historias).
 * Las fotos NO son públicas: se piden con el token de la sesión. Si el token venció mientras tanto,
 * se renueva una vez y se vuelve a pedir.
 */
export default function ImagenApi({ ruta, estilo, modo = 'cover', accessibilityLabel }) {
  const [intento, setIntento] = useState(0);
  if (!ruta) return <View style={[{ backgroundColor: colores.pista }, estilo]} />;
  const alFallar = async () => {
    if (intento > 0) return;
    try {
      await renovarSesion();
    } catch {
      // sin sesión: la foto queda en gris
    }
    setIntento(1);
  };
  return (
    <Image
      key={intento}
      source={{ uri: urlApi(ruta), headers: headersAuth() }}
      style={[{ backgroundColor: colores.pista }, estilo]}
      resizeMode={modo}
      onError={alFallar}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}
