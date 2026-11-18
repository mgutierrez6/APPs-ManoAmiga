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

  // --- Rediseño (Sprint 4) ---
  estrella: () => <Path d="M12 3.5l2.4 5.1 5.6.7-4.1 3.9 1 5.5-4.9-2.7-4.9 2.7 1-5.5L4 9.3l5.6-.7z" />,
  calendario: () => (
    <>
      <Rect x="4" y="5" width="16" height="15" rx="3" />
      <Path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  corazon: () => <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  chat: () => (
    <>
      <Path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <Path d="M8 10h8M8 13h5" />
    </>
  ),
  // Tres personas abrazadas (tipo "Donaciones").
  familia: () => (
    <>
      <Circle cx="12" cy="6.5" r="2.6" />
      <Circle cx="5.2" cy="9" r="2" />
      <Circle cx="18.8" cy="9" r="2" />
      <Path d="M8.6 20v-3.6a3.4 3.4 0 0 1 6.8 0V20" />
      <Path d="M2.4 20v-2.4a2.9 2.9 0 0 1 4.6-2.4M21.6 20v-2.4a2.9 2.9 0 0 0-4.6-2.4" />
      <Path d="M5.6 15.6c2 1.6 4 2.1 6.4 2.1s4.4-.5 6.4-2.1" />
    </>
  ),
  camara: () => (
    <>
      <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <Circle cx="12" cy="12.5" r="3.2" />
    </>
  ),
  lapiz: () => <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  izquierda: () => <Path d="M15 5l-7 7 7 7" />,
  derecha: () => <Path d="M9 5l7 7-7 7" />,
  buscar: () => (
    <>
      <Circle cx="11" cy="11" r="6" />
      <Path d="M20 20l-4-4" />
    </>
  ),
  // Íconos de los tipos de actividad (los mismos se usan en los pines del mapa).
  hoja: () => (
    <>
      <Path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" />
      <Path d="M5 19c3-4 6-7 10-9" />
    </>
  ),
  regalo: () => (
    <>
      <Rect x="4" y="9" width="16" height="11" rx="2" />
      <Path d="M3 9h18M12 9v11M12 9c-1.5-3-5-4-5-1.5S10 9 12 9zM12 9c1.5-3 5-4 5-1.5S14 9 12 9z" />
    </>
  ),
  olla: () => (
    <>
      <Path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" />
      <Path d="M2 11h20M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5" />
    </>
  ),
  casa: () => (
    <>
      <Path d="M3 11l9-7 9 7v9H3z" />
      <Path d="M12 17s-3-1.8-3-3.6a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8C15 15.2 12 17 12 17z" />
    </>
  ),
  libro: () => (
    <>
      <Path d="M4 5h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v13h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z" />
      <Path d="M12 6v13" />
    </>
  ),
  pelota: () => (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12 4l2.5 4.5L12 12 9.5 8.5zM12 12l4 2-1 5M12 12l-4 2 1 5M4.5 9.5l5-1M19.5 9.5l-5-1" />
    </>
  ),
  pata: () => (
    <>
      <Path d="M12 13c-3 0-5.5 3-5.5 5a2 2 0 0 0 2.4 2c1.1-.3 2-.6 3.1-.6s2 .3 3.1.6a2 2 0 0 0 2.4-2c0-2-2.5-5-5.5-5z" />
      <Circle cx="7" cy="9.5" r="1.8" />
      <Circle cx="10.2" cy="5.8" r="1.8" />
      <Circle cx="13.8" cy="5.8" r="1.8" />
      <Circle cx="17" cy="9.5" r="1.8" />
    </>
  ),
  // Novedades: un diario (distinto del globo del chat).
  novedades: () => (
    <>
      <Path d="M4 5h13v14H6a2 2 0 0 1-2-2z" />
      <Path d="M17 9h3v8a2 2 0 0 1-2 2" />
      <Path d="M7.5 9h6M7.5 12.5h6M7.5 16h4" />
    </>
  ),
  // Campanita de los avisos.
  campana: () => (
    <>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <Path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  // Avión de papel: mandar un mensaje del chat.
  enviar: () => <Path d="M21 3 3 10.5l7 2.5 2.5 7L21 3zM10 13l5-5" />,
  taza: () => (
    <>
      <Path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <Path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.5 1 2 1 3.5M12 3.5c0 1.5 1 2 1 3.5" />
    </>
  ),
};

export default function Icono({ nombre, color = '#073B4C', tamano = 22, grosor = 1.9 }) {
  const dibujo = DIBUJOS[nombre] || DIBUJOS.punto;
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round">
      {dibujo()}
    </Svg>
  );
}
