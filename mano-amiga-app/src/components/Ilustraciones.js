import { LogoAnimado, LogoMarca } from './Logo';

/*
 * Las ilustraciones (corazón con cara, caja con confeti, medalla) se reemplazaron por el logo.
 * Se mantienen los nombres para no romper importaciones.
 */

export function IlustracionBienvenida({ tamano = 120 }) {
  return <LogoAnimado tamano={tamano} conNombre={false} />;
}

export function IlustracionVacia({ tamano = 64 }) {
  return <LogoMarca tamano={tamano} opacidad={0.35} />;
}

export function IlustracionMedalla({ tamano = 48 }) {
  return <LogoMarca tamano={tamano} />;
}
