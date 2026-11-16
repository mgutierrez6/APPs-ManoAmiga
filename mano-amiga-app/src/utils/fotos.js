import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_URL, headersAuth, renovarSesion } from '../api/client';

/*
 Elegir fotos del celular y subirlas a la API (POST /archivos?uso=...).
 - Antes de subir, cada foto se achica (máx. 1280 px de ancho) y se pasa a JPG: queda en ~200-400 KB.
 - La API controla de nuevo el tipo real de la imagen y el tamaño (máx. 4 MB).
 - "uso" decide quién la puede ver: perfil e historia solo su dueño; organización y publicación,
   cualquiera con sesión.
 */
const ANCHO_MAXIMO = 1280;

export async function elegirFotos({ multiples = false, limite = 10 } = {}) {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiples,
    selectionLimit: multiples ? limite : 1,
    quality: 1,
  });
  if (r.canceled) return [];
  return r.assets || [];
}

async function achicar(asset) {
  const ctx = ImageManipulator.manipulate(asset.uri);
  if ((asset.width || 0) > ANCHO_MAXIMO) ctx.resize({ width: ANCHO_MAXIMO });
  const imagen = await ctx.renderAsync();
  const guardada = await imagen.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });
  return guardada.uri;
}

/** Sube UNA foto ya elegida. Devuelve { id, url }. */
export async function subirFoto(asset, uso) {
  const uri = await achicar(asset);
  const cuerpo = await (await fetch(uri)).blob();
  const enviar = () =>
    fetch(`${API_URL}/archivos?uso=${encodeURIComponent(uso)}`, {
      method: 'POST',
      headers: { ...headersAuth(), 'Content-Type': 'image/jpeg' },
      body: cuerpo,
    });
  let res = await enviar();
  if (res.status === 401) {
    await renovarSesion();
    res = await enviar();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error?.message || 'No se pudo subir la foto');
    error.response = { status: res.status, data };
    throw error;
  }
  return data;
}

/** Abre la galería y sube lo que la persona elija. Devuelve la lista de { id, url } (vacía si canceló). */
export async function elegirYSubir(uso, opciones) {
  const assets = await elegirFotos(opciones);
  const subidas = [];
  for (const a of assets) subidas.push(await subirFoto(a, uso));
  return subidas;
}
