/**
 * Campañas y jornadas REALES de Uruguay, de noviembre-diciembre de 2026:  node src/scripts/seed-campanas.js
 *
 * Qué carga:
 *  - CAMPAÑAS (colectas):   Teletón 2026, Rifa 2026 de la Fundación Pérez Scremini, "Navidad Permanente"
 *                           de la Legión de la Buena Voluntad.
 *  - ACTIVIDADES (jornadas): Día Internacional de Limpieza de Costas (14/11): 9 playas de Maldonado y 16 de
 *                           Colonia con sus horarios reales, y la construcción de TECHO en Salto (28 y 29/11).
 *  - Publicaciones de convocatoria en el feed.
 *
 * Qué es real y qué no:
 *  - Organizaciones, fechas, horarios, lugares, objetivos y montos salen de fuentes públicas (ver FUENTES abajo).
 *  - Lo que la app pide y las fuentes no dicen lo pusimos nosotras: el CUPO de cada actividad, las ETIQUETAS
 *    (son categorías de la app), el fin de la campaña de la Legión (dice "diciembre") y los coordinadores
 *    (cuentas demo @manoamiga.test, contraseña SEED_DEMO_PASSWORD).
 *  - Coordenadas: aproximadas, solo para el mapa.
 *
 * Validaciones antes de guardar (si algo falla, no guarda nada):
 *  - Cada etiqueta tiene que existir en el catálogo (el de `npm run seed`). Este script NO crea etiquetas.
 *  - Todo tiene que terminar en el futuro: lo que ya terminó se saltea con un aviso.
 *  - Inicio < fin, coordenadas dentro de Uruguay, y las reglas del modelo (largos máximos, cupo >= 1, etc.).
 *
 * Es idempotente: se busca todo por título + organización, así que se puede correr varias veces.
 * Si ya corrieron seed-demo.js, la "Rifa 2026" de la Pérez Scremini se ACTUALIZA con las fechas reales.
 */
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const db = require('../config/db');
const { Etiqueta, Organizacion, Usuario, Actividad, Campana, Publicacion } = require('../models');

// Fechas en hora de Uruguay (UTC-3).
const uy = (texto) => new Date(`${texto}:00-03:00`);

// El catálogo que crea `npm run seed`. Si alguien cambia una etiqueta acá, el script avisa en vez de inventarla.
const CATALOGO = [
  'Ollas populares', 'Medioambiente', 'Urgente', 'Donaciones', 'Adultos mayores', 'Apto programa judicial',
  'Apoyo escolar', 'Contacto con menores', 'Hogares de niños', 'Oratorios',
];

const ORGANIZACIONES = {
  // Mismos nombres y claves que seed-demo.js: si ya existen, se reutilizan (no se duplican).
  techo: { nombre: 'TECHO Uruguay', contacto: 'techo.org · Instagram techo_uy', convenioOSLA: false, coord: ['Martín', 'Olivera'] },
  scremini: { nombre: 'Fundación Pérez Scremini', contacto: 'perezscremini.org', convenioOSLA: false, coord: ['Gonzalo', 'Ferreira'] },
  // Nuevas
  ambiente: { nombre: 'Ministerio de Ambiente', contacto: 'gub.uy/ministerio-ambiente · 2917 3380', convenioOSLA: true, coord: ['Lorena', 'Sánchez'] },
  teleton: { nombre: 'Fundación Teletón Uruguay', contacto: 'teleton.org.uy', convenioOSLA: false, coord: ['Andrés', 'Cardozo'] },
  lbv: { nombre: 'Legión de la Buena Voluntad', contacto: 'Tel. 2308 6074', convenioOSLA: false, coord: ['Silvana', 'Pereyra'] },
};

const CAMPANAS = [
  {
    org: 'teleton',
    titulo: 'Teletón 2026 · #CumplimosJuntos',
    fechaInicio: uy('2026-11-03T00:00'),
    fechaFin: uy('2026-11-14T23:59'),
    objetivo: 'Financiar la rehabilitación infantil en los centros de Montevideo y Fray Bentos (la Teletón aporta el 95% de los fondos anuales de la Fundación)',
    descripcion:
      'Maratón televisiva de 25 horas el 13 y 14 de noviembre, por los 20 años de atención de la Fundación en Uruguay. ' +
      'Se puede donar en la web oficial, con alcancías físicas y digitales, o como "Socio de Corazón" (aporte mensual). ' +
      'Empresas, escuelas y barrios pueden organizar sus propias "Movidas Ciudadanas". Los centros atienden a más de 1.900 niños y jóvenes por año.',
    puntos: [], // se dona en línea y con alcancías: no hay puntos de acopio de objetos
    fuente: 'https://rionegroahora.com/2026/11/03/13-y-14-de-noviembre-todos-por-teleton/',
  },
  {
    org: 'scremini',
    titulo: 'Rifa 2026', // mismo título que en seed-demo.js: actualiza esa campaña con los datos reales
    fechaInicio: uy('2026-06-25T00:00'),
    fechaFin: uy('2026-11-13T13:00'),
    objetivo: 'Apoyar la cura del cáncer en niños y adolescentes',
    descripcion:
      'Rifa anual de la Fundación Pérez Scremini. Cada número cuesta $ 100 y se compra en perezscremini.org, en Santander (incluida Supernet), ' +
      'en Colectate, o en persona a voluntarios y vendedores de la Fundación. El sorteo es el viernes 13 de noviembre a las 13:00 en Bulevar Artigas 1556, Montevideo.',
    puntos: [],
    fuente: 'https://perezscremini.org/wp-content/uploads/2026/06/FPS_Terminos-y-condiciones_2026.pdf',
  },
  {
    org: 'lbv',
    titulo: 'Navidad Permanente: 300 canastas',
    fechaInicio: uy('2026-10-21T00:00'),
    fechaFin: uy('2026-12-15T23:59'), // la fuente dice "entrega en diciembre", sin día: fecha de cierre estimada
    objetivo: 'Entregar 300 canastas de alimentos a hogares de bajos recursos',
    descripcion:
      'Campaña anual de la Legión de la Buena Voluntad. Cada canasta cuesta $ 1.600 (se puede donar 1, 5 o 10). ' +
      'Se colabora por débito automático (OCA, Visa, Master, Cabal, Italcred, Tarjeta D), por transferencia al BROU (cuenta 001564463-00001) ' +
      'o llamando al 2308 6074. Las canastas llegan al asentamiento 40 Semanas, a la comunidad San Miguel (Santa Catalina) y a familias de los programas de la institución. Entrega en diciembre.',
    puntos: [],
    fuente: 'https://helvecia.com.uy/2026/10/21/la-legion-de-la-buena-voluntad-lanza-su-campana-navidad-permanente-para-asistir-a-300-familias/',
  },
];

// ---------------------------------------------------------------------------------------------
// Día Internacional de Limpieza de Costas, sábado 14/11/2026: playas y horarios REALES publicados para
// Maldonado y Colonia (cada jornada dura unas 2 horas). Para Montevideo, Canelones, San José y Rocha
// no encontramos la lista de playas de 2026, así que no se inventan.
// [departamento, playa/lugar que se muestra, lat, lng, hora inicio, hora fin, etiquetas]
// ---------------------------------------------------------------------------------------------
const MED = ['Medioambiente', 'Apto programa judicial'];
const PLAYAS = [
  // Maldonado (fuente: Portada Punta)
  ['Maldonado', 'Sauce de Portezuelo', -34.8720, -55.1550, '08:30', '10:30', MED],
  ['Maldonado', 'Chihuahua', -34.8750, -55.0889, '08:30', '10:30', MED],
  ['Maldonado', 'Portezuelo (Solanas)', -34.8990, -55.0560, '08:30', '10:30', MED],
  ['Maldonado', 'Ocean Park', -34.8750, -55.1300, '09:00', '11:00', MED],
  ['Maldonado', 'Las Grutas (Punta Ballena)', -34.9020, -55.0380, '09:00', '11:00', MED],
  ['Maldonado', 'Punta Colorada', -34.9011, -55.2586, '09:00', '11:00', MED],
  ['Maldonado', 'Punta Negra', -34.9000, -55.2250, '09:00', '11:00', MED],
  ['Maldonado', 'Playa Mansa, parada 1 (Punta del Este)', -34.9575, -54.9445, '09:00', '11:00', MED],
  ['Maldonado', 'Laguna Garzón', -34.8020, -54.5600, '11:00', '13:00', ['Medioambiente']],
  // Colonia (fuente: Helvecia). Coordina el Grupo Panda Educación Ambiental.
  ['Colonia', 'Nueva Palmira', -33.8803, -58.4117, '09:00', '11:00', MED],
  ['Colonia', 'Carmelo: Playa Seré y Playa Treinta y Tres', -33.9960, -58.2950, '09:00', '11:00', MED],
  ['Colonia', 'Balneario Zagarzazú (Carmelo)', -33.9667, -58.3333, '09:00', '11:00', MED],
  ['Colonia', 'Conchillas', -34.1667, -58.0333, '09:00', '11:00', MED],
  ['Colonia', 'Juan Lacaze: Playa Charrúa, Playa Verde y Villa Pancha', -34.4342, -57.4383, '09:00', '11:00', MED],
  ['Colonia', 'Santa Ana', -34.4400, -57.6200, '09:00', '11:00', MED],
  ['Colonia', 'Artilleros', -34.4400, -57.5800, '09:00', '11:00', MED],
  ['Colonia', 'Colonia del Sacramento: Oreja de Negro, Las Rocas y La Boya', -34.4717, -57.8442, '10:00', '12:00', MED],
  ['Colonia', 'El Ensueño', -34.4450, -57.6450, '10:00', '12:00', MED],
  ['Colonia', 'Blancarena (Costas del Inmigrante)', -34.4320, -57.3000, '10:00', '12:00', MED],
  ['Colonia', 'Britópolis (Costas del Inmigrante)', -34.4370, -57.2850, '10:00', '12:00', MED],
  ['Colonia', 'Playa Fomento (Costas del Inmigrante)', -34.4430, -57.2500, '10:00', '12:00', MED],
  ['Colonia', 'Los Pinos (Costas del Inmigrante)', -34.4470, -57.2350, '10:00', '12:00', MED],
  ['Colonia', 'Santa Regina (Costas del Inmigrante)', -34.4550, -57.2050, '10:00', '12:00', MED],
  ['Colonia', 'Campamento Artigas, ACJ (Costas del Inmigrante)', -34.4580, -57.1900, '10:00', '12:00', MED],
  ['Colonia', 'Brisas del Plata (Costas del Inmigrante)', -34.4620, -57.1750, '10:00', '12:00', MED],
];
const FUENTE_LIMPIEZA = {
  Maldonado: 'https://www.portada.com.uy/jornada-de-limpieza-de-costas-en-que-playas-de-maldonado-habra-actividades-101656',
  Colonia: 'https://helvecia.com.uy/2026/11/02/dia-internacional-de-limpieza-de-costas-jornada-de-voluntariado-ambiental-en-las-playas-de-colonia/',
};
// Títulos que usaba la primera versión de este script (se reemplazan por los de arriba).
const TITULOS_VIEJOS = ['Limpieza de Costas: Playa Mansa (parada 1), Punta del Este', 'Limpieza de Costas: Portezuelo'];
const descripcionLimpieza = (depto, lugar) =>
  `Día Internacional de Limpieza de Costas 2026 (17ª edición en Uruguay), coordinado por el Ministerio de Ambiente con las intendencias costeras, ` +
  `más de 80 organizaciones civiles y centros educativos. Jornada de unas 2 horas en ${lugar} (${depto}): recolección y registro de residuos. ` +
  (depto === 'Colonia'
    ? 'En Colonia la coorganiza el Grupo Panda Educación Ambiental; se trabaja en grupos con una persona coordinadora y no se retiran juncos, algas ni camalotes.'
    : 'Ese mismo sábado hay limpiezas en Colonia, San José, Montevideo, Canelones, Maldonado y Rocha.');

const ACTIVIDADES = [
  ...PLAYAS.map(([depto, lugar, lat, lng, desde, hasta, etiquetas]) => ({
    org: 'ambiente',
    titulo: `Limpieza de Costas: ${lugar}`,
    inicio: uy(`2026-11-14T${desde}`), fin: uy(`2026-11-14T${hasta}`), cupo: 30,
    lugar: [lat, lng, `${lugar}, ${depto}`],
    etiquetas,
    descripcion: descripcionLimpieza(depto, lugar),
    fuente: FUENTE_LIMPIEZA[depto],
  })),
  {
    org: 'techo', titulo: 'Construcción de viviendas de emergencia en Salto',
    inicio: uy('2026-11-28T08:00'), fin: uy('2026-11-29T18:00'), cupo: 40, // horario y cupo: a confirmar con TECHO
    lugar: [-31.3830, -57.9550, 'Barrio Andresito, Salto'],
    etiquetas: ['Urgente'],
    descripcion:
      'TECHO Uruguay construye cinco viviendas de emergencia, cada una con baño, para familias del barrio Andresito afectadas por el temporal del 18 de julio. ' +
      'Participa también la comunidad de la Universidad Católica (sede Salto). Horarios a confirmar con TECHO (Instagram techo_uy).',
    fuente: 'https://www.eltelegrafo.com/2026/11/organizacion-techo-uruguay-construira-cinco-viviendas-de-emergencia-en-salto/',
  },
];

// Publicaciones del feed: [org, 'campana' | 'actividad', título del proyecto, contenido]
const PUBLICACIONES = [
  ['teleton', 'campana', 'Teletón 2026 · #CumplimosJuntos', '¡El 13 y 14 de noviembre es la Teletón! 25 horas de transmisión por los 20 años de la Fundación. Doná en teleton.org.uy o sumate como Socio de Corazón.'],
  ['scremini', 'campana', 'Rifa 2026', 'Últimos días: el sorteo es el viernes 13 de noviembre a las 13:00. Cada número cuesta $ 100.'],
  ['lbv', 'campana', 'Navidad Permanente: 300 canastas', 'Cada canasta de $ 1.600 es una Navidad para una familia. Nuestra meta: 300 canastas.'],
  ['ambiente', 'actividad', 'Limpieza de Costas: Playa Mansa, parada 1 (Punta del Este)', 'Este sábado 14 limpiamos las playas en los seis departamentos costeros. En Punta del Este arrancamos a las 9:00 en la parada 1 de la Mansa.'],
  ['ambiente', 'actividad', 'Limpieza de Costas: Colonia del Sacramento: Oreja de Negro, Las Rocas y La Boya', 'Colonia se suma con más de 20 playas, de 9:00 a 12:00 según la zona. Trabajamos en grupos con una persona coordinadora.'],
  ['techo', 'actividad', 'Construcción de viviendas de emergencia en Salto', 'El 28 y 29 de noviembre construimos 5 viviendas en el barrio Andresito de Salto. ¡Sumate!'],
];

// ---------------------------------------------------------------------------------------------

const enUruguay = ([lat, lng]) => lat >= -35.1 && lat <= -30.0 && lng >= -58.5 && lng <= -53.0;

async function main() {
  const passwordDemo = process.env.SEED_DEMO_PASSWORD;
  if (!passwordDemo || passwordDemo.length < 8) {
    throw new Error('Falta SEED_DEMO_PASSWORD en el .env (8 caracteres o más): es la contraseña de los coordinadores demo');
  }
  await db.conectar(config.mongoUri);
  const ahora = new Date();

  // 1. Etiquetas: tienen que existir TODAS las del catálogo. No se crean acá.
  const enBase = new Map((await Etiqueta.find({ nombre: { $in: CATALOGO } }).lean()).map((e) => [e.nombre, e._id]));
  const faltan = CATALOGO.filter((n) => !enBase.has(n));
  if (faltan.length) throw new Error(`Faltan etiquetas en la base (${faltan.join(', ')}). Corré primero: npm run seed`);
  for (const a of ACTIVIDADES) {
    const raras = a.etiquetas.filter((n) => !CATALOGO.includes(n));
    if (raras.length) throw new Error(`"${a.titulo}" usa etiquetas que no están en el catálogo: ${raras.join(', ')}`);
  }

  // 2. Validar todo ANTES de escribir nada.
  const errores = [];
  const vigentes = (lista, fin, nombre) => lista.filter((x) => {
    if (fin(x) <= ahora) { console.log(`  ⏭  "${nombre(x)}" ya terminó: se saltea`); return false; }
    return true;
  });
  const campanas = vigentes(CAMPANAS, (c) => c.fechaFin, (c) => c.titulo);
  const actividades = vigentes(ACTIVIDADES, (a) => a.fin, (a) => a.titulo);
  for (const c of campanas) if (c.fechaInicio >= c.fechaFin) errores.push(`${c.titulo}: el inicio no es anterior al fin`);
  for (const a of actividades) {
    if (a.inicio >= a.fin) errores.push(`${a.titulo}: el inicio no es anterior al fin`);
    if (!enUruguay(a.lugar)) errores.push(`${a.titulo}: la ubicación no está en Uruguay`);
  }
  // Reglas del modelo (largos, requeridos, cupo...) con documentos de prueba que NO se guardan.
  const idFalso = new Organizacion()._id;
  for (const c of campanas) {
    await new Campana({ organizacionId: idFalso, creadaPor: idFalso, ...c }).validate()
      .catch((err) => errores.push(`${c.titulo}: ${err.message}`));
  }
  for (const a of actividades) {
    await new Actividad({
      titulo: a.titulo, descripcion: a.descripcion, organizacionId: idFalso, creadaPor: idFalso,
      ubicacion: { type: 'Point', coordinates: [a.lugar[1], a.lugar[0]] }, direccion: a.lugar[2],
      fechaInicio: a.inicio, fechaFin: a.fin, cupo: a.cupo,
    }).validate().catch((err) => errores.push(`${a.titulo}: ${err.message}`));
  }
  if (errores.length) throw new Error(`Datos inválidos, no se guardó nada:\n  - ${errores.join('\n  - ')}`);

  // 3. Organizaciones y coordinadores (updateOne + findOne: el hash tiene select:false en el modelo).
  const hash = await bcrypt.hash(passwordDemo, config.bcryptCosto);
  console.log('Organizaciones:');
  const orgs = {};
  const coords = {};
  for (const [clave, o] of Object.entries(ORGANIZACIONES)) {
    orgs[clave] = await Organizacion.findOneAndUpdate(
      { nombre: o.nombre },
      { $set: { contacto: o.contacto, convenioOSLA: o.convenioOSLA, activa: true } },
      { upsert: true, returnDocument: 'after' }
    );
    const email = `coord.${clave}@manoamiga.test`;
    const existente = await Usuario.findOne({ email });
    if (!existente) {
      await Usuario.updateOne(
        { email },
        { $set: { nombre: o.coord[0], apellido: o.coord[1], passwordHash: hash, rol: 'coordinador', organizacionId: orgs[clave]._id, activo: true } },
        { upsert: true }
      );
    }
    coords[clave] = await Usuario.findOne({ email });
    console.log(`  ✔ ${o.nombre}  →  ${email}${existente ? ' (ya existía)' : ''}`);
  }

  // 4. Campañas
  console.log('Campañas:');
  const proyectos = new Map();
  for (const c of campanas) {
    const doc = await Campana.findOneAndUpdate(
      { titulo: c.titulo, organizacionId: orgs[c.org]._id },
      {
        $set: {
          creadaPor: coords[c.org]._id, descripcion: c.descripcion, objetivo: c.objetivo, puntos: c.puntos,
          fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, estado: 'activa',
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    proyectos.set(`campana:${c.titulo}`, doc);
    console.log(`  ✔ ${c.titulo}  (hasta ${c.fechaFin.toLocaleString('es-UY', { timeZone: 'America/Montevideo' })})`);
  }

  // 5. Actividades. Primero se borran las 2 de la versión anterior de este script (tenían otro título),
  //    solo si nadie se inscribió, para que no queden repetidas.
  const viejas = await Actividad.find({ organizacionId: orgs.ambiente._id, titulo: { $in: TITULOS_VIEJOS }, inscriptos: 0 }).select('_id').lean();
  if (viejas.length) {
    await Publicacion.deleteMany({ proyectoId: { $in: viejas.map((v) => v._id) } });
    await Actividad.deleteMany({ _id: { $in: viejas.map((v) => v._id) } });
    console.log(`  (se reemplazaron ${viejas.length} actividades de la versión anterior)`);
  }
  console.log('Actividades:');
  for (const a of actividades) {
    const doc = await Actividad.findOneAndUpdate(
      { titulo: a.titulo, organizacionId: orgs[a.org]._id },
      {
        $set: {
          descripcion: a.descripcion, creadaPor: coords[a.org]._id, etiquetas: a.etiquetas.map((n) => enBase.get(n)),
          ubicacion: { type: 'Point', coordinates: [a.lugar[1], a.lugar[0]] }, direccion: a.lugar[2],
          fechaInicio: a.inicio, fechaFin: a.fin, cupo: a.cupo, estado: 'publicada',
        },
        $setOnInsert: { inscriptos: 0 },
      },
      { upsert: true, returnDocument: 'after' }
    );
    proyectos.set(`actividad:${a.titulo}`, doc);
    console.log(`  ✔ ${a.titulo}  [${a.etiquetas.join(', ')}]`);
  }

  // 6. Publicaciones (solo de los proyectos que se cargaron)
  let publicadas = 0;
  for (const [org, tipo, titulo, contenido] of PUBLICACIONES) {
    const proyecto = proyectos.get(`${tipo}:${titulo}`);
    if (!proyecto) continue;
    await Publicacion.updateOne(
      { proyectoId: proyecto._id, contenido },
      {
        $set: { proyectoTipo: tipo, organizacionId: orgs[org]._id, autorId: coords[org]._id, tipo: 'convocatoria' },
        $setOnInsert: { fecha: ahora },
      },
      { upsert: true }
    );
    publicadas++;
  }
  console.log(`Publicaciones: ✔ ${publicadas}`);

  await db.desconectar();
  console.log(`Listo: ${campanas.length} campañas y ${actividades.length} actividades reales.`);
}

main().catch(async (err) => {
  console.error('Error en el seed de campañas:', err.message);
  await db.desconectar().catch(() => {});
  process.exit(1);
});