import { View } from 'react-native';

/*
 * Antes este archivo tenía figuras decorativas animadas (blobs, anillos, destellos, garabatos).
 * El rediseño las saca: la única animación de la app es el logo del ingreso (components/Logo.js).
 * Se mantienen los nombres para que ninguna pantalla se rompa: los envoltorios muestran a su hijo
 * quieto y las figuras no dibujan nada.
 */

export function Flotante({ children, style }) {
  return <View style={style}>{children}</View>;
}

export function Girando({ children, style }) {
  return <View style={style}>{children}</View>;
}

const Nada = () => null;

export const Blob = Nada;
export const Anillo = Nada;
export const Puntos = Nada;
export const Garabato = Nada;
export const Destello = Nada;
export const Corazon = Nada;
export const MedioCirculo = Nada;
export const Zigzag = Nada;
export const FigurasEncabezado = Nada;
