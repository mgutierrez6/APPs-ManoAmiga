import Svg, { Circle, Path, Rect } from 'react-native-svg';

/*
 * Íconos propios de trazo (reemplazan a los emojis). Mismo grosor y esquinas redondeadas en todos.
 * Uso: <Icono nombre="mapa" color={colores.tinta} tamano={22} />
 */

const DIBUJOS = {
  actividades: () => (
    <>
      <Rect x="4" y="5" width="16" height="15" rx="3" />
      <Path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  mapa: () => (
    <>
      <Path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
      <Circle cx="12" cy="10" r="2.2" />
    </>
  ),
  campanas: () => (
    <>
      <Path d="M4 8l8-4 8 4v9l-8 4-8-4z" />
      <Path d="M4 8l8 4 8-4M12 12v9" />
    </>
  ),
  inscripciones: () => (
    <>
      <Rect x="5" y="4" width="14" height="17" rx="2.5" />
      <Path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  perfil: () => (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  carpeta: () => <Path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  organizaciones: () => (
    <>
      <Rect x="5" y="3" width="14" height="18" rx="2" />
      <Path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" />
    </>
  ),
  usuarios: () => (
    <>
      <Circle cx="9" cy="8" r="3.2" />
      <Path d="M3 20c1-3.5 3.3-5 6-5s5 1.5 6 5M16 5.2a3 3 0 0 1 0 5.6M18 15c1.6.6 2.6 2.2 3 5" />
    </>
  ),
  judiciales: () => (
    <>
      <Path d="M12 4v16M7 20h10M5 7h14" />
      <Path d="M5 7l-2.5 6a3 3 0 0 0 5 0zM19 7l-2.5 6a3 3 0 0 0 5 0z" />
    </>
  ),
  auditoria: () => (
    <>
      <Circle cx="11" cy="11" r="6" />
      <Path d="M20 20l-4.5-4.5" />
    </>
  ),
  reloj: () => (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12 8v4l3 2" />
    </>
  ),
  check: () => <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  cerrar: () => <Path d="M6 6l12 12M18 6L6 18" />,
  mas: () => <Path d="M12 5v14M5 12h14" />,
  qr: () => (
    <>
      <Rect x="4" y="4" width="6" height="6" rx="1" />
      <Rect x="14" y="4" width="6" height="6" rx="1" />
      <Rect x="4" y="14" width="6" height="6" rx="1" />
      <Path d="M14 14h2v2M20 14v6h-6v-2M17 17h0" />
    </>
  ),
  punto: () => <Circle cx="12" cy="12" r="3" />,
};

export default function Icono({ nombre, color = '#073B4C', tamano = 22, grosor = 1.9 }) {
  const dibujo = DIBUJOS[nombre] || DIBUJOS.punto;
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round">
      {dibujo()}
    </Svg>
  );
}
