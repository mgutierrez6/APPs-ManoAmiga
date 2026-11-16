import { StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/*
 Fondo "de anuario" para Mi historia: el color del tipo de actividad con formas (festones, burbujas,
 ondas, arcos o chispas) en dos colores que combinan. Es puramente decorativo.
 */
const ROSA = '#E763A5';
const SOL = '#F9C386';
const LIMA = '#B7D665';
const CORAL = '#F77279';
const LIMON = '#FFF184';
const CIELO = '#407ADD';
const POLVO = '#B9D6FC';
const ROSA_CLARO = '#F8D3E5';
const CELESTE = '#D7F3FF';
const BEIGE = '#F3E9DA';

export const ESTILOS_FONDO = {
  // Cada tipo combina con colores distintos de la paleta (no todos con rosado).
  Medioambiente: { bg: LIMA, fig: LIMON, fig2: CELESTE, forma: 'burbujas' },
  'Hogares de niños': { bg: ROSA, fig: SOL, fig2: ROSA_CLARO, forma: 'arcos' },
  'Adultos mayores': { bg: POLVO, fig: LIMA, fig2: LIMON, forma: 'festones' },
  'Ollas populares': { bg: CORAL, fig: LIMON, fig2: SOL, forma: 'ondas' },
  'Apoyo escolar': { bg: LIMON, fig: CIELO, fig2: LIMA, forma: 'chispas' },
  Donaciones: { bg: SOL, fig: CORAL, fig2: LIMON, forma: 'festones' },
  Oratorios: { bg: CIELO, fig: LIMON, fig2: POLVO, forma: 'burbujas' },
  Animales: { bg: CELESTE, fig: LIMA, fig2: SOL, forma: 'burbujas' },
  Otros: { bg: BEIGE, fig: POLVO, fig2: LIMA, forma: 'chispas' },
};
const POR_DEFECTO = { bg: BEIGE, fig: POLVO, fig2: LIMA, forma: 'chispas' }; // = Otros

export const estiloFondo = (tipo) => ESTILOS_FONDO[tipo] || POR_DEFECTO;

const Estrella = ({ x, y, s, c }) => (
  <Path transform={`translate(${x} ${y}) scale(${s / 24})`} d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill={c} />
);

function Festones({ y, r, c, arriba }) {
  const n = Math.ceil(390 / (2 * r)) + 1;
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <Circle key={k} cx={k * 2 * r} cy={y} r={r} fill={c} />
      ))}
      {arriba ? <Rect x="0" y="0" width="390" height={y} fill={c} /> : <Rect x="0" y={y} width="390" height={844 - y} fill={c} />}
    </>
  );
}

function Formas({ e }) {
  switch (e.forma) {
    case 'festones':
      return (
        <>
          <Festones y={150} r={33} c={e.fig} arriba />
          <Festones y={712} r={33} c={e.fig2} />
          <Estrella x={330} y={56} s={30} c={e.fig2} />
          <Estrella x={36} y={650} s={22} c={e.fig} />
          <Estrella x={350} y={670} s={16} c={e.fig} />
        </>
      );
    case 'burbujas':
      return (
        <>
          <Circle cx="-30" cy="110" r="150" fill={e.fig} />
          <Circle cx="420" cy="770" r="190" fill={e.fig} />
          <Circle cx="330" cy="70" r="38" fill={e.fig2} />
          <Circle cx="60" cy="760" r="26" fill={e.fig2} />
          <Estrella x={250} y={40} s={26} c={e.fig2} />
          <Estrella x={140} y={700} s={20} c={e.fig2} />
        </>
      );
    case 'ondas':
      return (
        <>
          <Path d="M0 0H390V120Q357 160 325 120T260 120T195 120T130 120T65 120T0 120Z" fill={e.fig} />
          <Path d="M0 844H390V720Q357 680 325 720T260 720T195 720T130 720T65 720T0 720Z" fill={e.fig2} />
          <Path d="M0 760Q48 735 97 760T195 760T292 760T390 760V844H0Z" fill={e.fig} />
          <Estrella x={340} y={40} s={26} c={e.fig2} />
          <Estrella x={30} y={60} s={18} c={e.fig2} />
        </>
      );
    case 'arcos':
      return (
        <>
          {[150, 115, 80].map((r, k) => (
            <Circle key={`a${k}`} cx="0" cy="844" r={r + 60} fill={k % 2 ? e.fig2 : e.fig} />
          ))}
          {[120, 85, 50].map((r, k) => (
            <Circle key={`b${k}`} cx="390" cy="0" r={r + 40} fill={k % 2 ? e.fig : e.fig2} />
          ))}
          <Estrella x={320} y={720} s={28} c={e.fig2} />
          <Estrella x={40} y={90} s={20} c={e.fig} />
        </>
      );
    default:
      return (
        <>
          <Festones y={740} r={28} c={e.fig} />
          {[
            [40, 60, 30],
            [300, 90, 22],
            [350, 30, 14],
            [80, 690, 18],
            [200, 60, 16],
            [330, 660, 26],
          ].map(([x, y, s], k) => (
            <Estrella key={k} x={x} y={y} s={s} c={k % 2 ? e.fig2 : e.fig} />
          ))}
        </>
      );
  }
}

export default function FondoTipo({ tipo }) {
  const e = estiloFondo(tipo);
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
      <Rect x="0" y="0" width="390" height="844" fill={e.bg} />
      <Formas e={e} />
    </Svg>
  );
}
