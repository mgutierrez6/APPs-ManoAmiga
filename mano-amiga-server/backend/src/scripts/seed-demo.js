/**
 * Datos de demostración (Uruguay):  node src/scripts/seed-demo.js
 *
 * Carga organizaciones, coordinadores, voluntarios, actividades, campañas con puntos de acopio,
 * publicaciones del feed, inscripciones y horas validadas, para que la app no se vea vacía en la demo.
 *
 *  - Las ORGANIZACIONES son reales (salvo las dos marcadas como ficticias), pero las ACTIVIDADES, fechas,
 *    cupos, convenios OSLA y personas son INVENTADAS para la demo. No representan convocatorias reales.
 *  - Las ubicaciones son siempre lugares públicos o institucionales (RS7), nunca casas de personas.
 *  - Las fechas se calculan a partir de HOY: cada vez que se corre, las actividades vuelven a quedar
 *    en las próximas semanas.
 *  - Es idempotente: se puede correr varias veces sin duplicar nada (todo se busca por un campo único).
 *  - Requiere haber corrido antes `npm run seed` (etiquetas, admin y usuario judicial).
 *  - La contraseña de TODAS las cuentas demo se lee de SEED_DEMO_PASSWORD en el .env (8+ caracteres).
 *    Todas las cuentas demo usan el dominio @manoamiga.test.
 */
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const db = require('../config/db');
const { Etiqueta, Organizacion, Usuario, Actividad, Campana, Publicacion, Inscripcion, Asistencia } = require('../models');

// ---------------------------------------------------------------------------------------------
// Lugares: [latitud, longitud, dirección que se muestra]. Coordenadas aproximadas (sirven para el mapa, no para navegar).
// ---------------------------------------------------------------------------------------------
const LUGARES = {
  pereiraRossell: [-34.8963, -56.1632, 'Hospital Pereira Rossell, Bvar. Artigas 1550, Montevideo'],
  ashAdopciones: [-34.9026, -56.1966, 'Centro de adopciones, Andes 1464, Montevideo'],
  uam: [-34.8195, -56.2398, 'Unidad Agroalimentaria Metropolitana (UAM), Ruta 5 y Cno. Luis Eduardo Pérez'],
  mam: [-34.8927, -56.1747, 'Mercado Agrícola de Montevideo, José L. Terra 2220'],
  tresCruces: [-34.8938, -56.1664, 'Terminal Tres Cruces, Bvar. Artigas y Av. Italia'],
  plazaIndependencia: [-34.9066, -56.1995, 'Plaza Independencia, Montevideo'],
  plazaCagancha: [-34.9058, -56.1903, 'Plaza Cagancha, 18 de Julio y Rondeau'],
  pocitos: [-34.9112, -56.1517, 'Pocitos, Montevideo (frente a la rambla)'],
  ramblaPocitos: [-34.9127, -56.1490, 'Rambla de Pocitos, a la altura de Av. Brasil'],
  villaBiarritz: [-34.9178, -56.1590, 'Parque Villa Biarritz, Punta Carretas'],
  parqueRodo: [-34.9137, -56.1679, 'Parque Rodó, junto al lago'],
  playaRamirez: [-34.9172, -56.1703, 'Playa Ramírez, Rambla Wilson'],
  playaBuceo: [-34.9048, -56.1330, 'Playa del Buceo, Rambla Armenia'],
  playaMalvin: [-34.8936, -56.1048, 'Playa Malvín, Rambla O’Higgins'],
  playaCerro: [-34.8902, -56.2512, 'Playa del Cerro, Montevideo'],
  playaBrava: [-34.9532, -54.9372, 'Playa Brava (Los Dedos), Punta del Este, Maldonado'],
  cerro: [-34.8870, -56.2580, 'Villa del Cerro, Montevideo'],
  laTeja: [-34.8665, -56.2300, 'La Teja, Montevideo (salón comunal)'],
  casavalle: [-34.8460, -56.1820, 'Casavalle, Montevideo'],
  piedrasBlancas: [-34.8250, -56.1490, 'Piedras Blancas, Montevideo'],
  colon: [-34.8020, -56.2240, 'Colón, Montevideo (asentamiento de la zona)'],
  prado: [-34.8600, -56.2045, 'Prado, Montevideo'],
  ciudadVieja: [-34.9065, -56.2110, 'Ciudad Vieja, Montevideo (Mercado del Puerto)'],
  malvin: [-34.8890, -56.1100, 'Malvín, Montevideo'],
  carrasco: [-34.8885, -56.0560, 'Carrasco, Rambla República de México'],
  parqueBatlle: [-34.8945, -56.1530, 'Parque Batlle, junto al Estadio Centenario'],
  tacuarembo: [-31.7130, -55.9800, 'Hospital de Tacuarembó, Tacuarembó'],
};

// ---------------------------------------------------------------------------------------------
// Organizaciones. contacto = sitio oficial o referencia pública. convenioOSLA es un valor de demo.
// ---------------------------------------------------------------------------------------------
const ORGANIZACIONES = {
  techo: { nombre: 'TECHO Uruguay', contacto: 'techo.org', convenioOSLA: false },
  bau: { nombre: 'Banco de Alimentos del Uruguay', contacto: 'bancodealimentos.org.uy', convenioOSLA: true },
  redalco: { nombre: 'Redalco · Red de Alimentos Compartidos', contacto: 'Opera en la UAM, Montevideo', convenioOSLA: true },
  cruzroja: { nombre: 'Cruz Roja Uruguaya', contacto: 'cruzroja.org.uy', convenioOSLA: false },
  ronald: { nombre: 'Casa Ronald McDonald Uruguay', contacto: 'Hospital Pereira Rossell, Montevideo', convenioOSLA: false },
  scremini: { nombre: 'Fundación Pérez Scremini', contacto: 'perezscremini.org', convenioOSLA: false },
  ash: { nombre: 'Animales Sin Hogar', contacto: 'Andes 1464, Montevideo', convenioOSLA: true },
  aldeas: { nombre: 'Aldeas Infantiles SOS Uruguay', contacto: 'aldeasinfantiles.org.uy', convenioOSLA: false },
  abrojo: { nombre: 'El Abrojo', contacto: 'elabrojo.org.uy', convenioOSLA: false },
  tacuru: { nombre: 'Movimiento Tacurú', contacto: 'Casavalle, Montevideo', convenioOSLA: false },
  huellas: { nombre: 'Huellas', contacto: 'Montevideo', convenioOSLA: true },
  costa: { nombre: 'Colectivo Costa Viva (ficticia)', contacto: 'costaviva@manoamiga.test', convenioOSLA: true },
  olla: { nombre: 'Olla Barrial La Teja (ficticia)', contacto: 'ollalateja@manoamiga.test', convenioOSLA: true },
};

// Un coordinador (inventado) por organización: coord.<clave>@manoamiga.test
const COORDINADORES = {
  techo: ['Martín', 'Olivera'],
  bau: ['Carolina', 'Méndez'],
  redalco: ['Diego', 'Rocha'],
  cruzroja: ['Ana Laura', 'Benítez'],
  ronald: ['Paula', 'Cabrera'],
  scremini: ['Gonzalo', 'Ferreira'],
  ash: ['Natalia', 'Duarte'],
  aldeas: ['Rodrigo', 'Viera'],
  abrojo: ['Mariana', 'López'],
  tacuru: ['Emiliano', 'Castro'],
  huellas: ['Verónica', 'Píriz'],
  costa: ['Agustina', 'Morales'],
  olla: ['Graciela', 'Techera'],
};

// Voluntarios inventados: nombre.apellido@manoamiga.test
const VOLUNTARIOS = [
  ['Lucía', 'Fernández'], ['Mateo', 'Rodríguez'], ['Valentina', 'Silva'], ['Santiago', 'Pereira'],
  ['Sofía', 'González'], ['Joaquín', 'Martínez'], ['Camila', 'Sosa'], ['Facundo', 'Suárez'],
  ['Florencia', 'Núñez'], ['Bruno', 'Acosta'], ['Martina', 'Ríos'], ['Tomás', 'Cardozo'],
];

// ---------------------------------------------------------------------------------------------
// Actividades. dia = días desde hoy (negativo = ya pasó y queda "finalizada").
// ---------------------------------------------------------------------------------------------
const ACTIVIDADES = [
  // TECHO
  { org: 'techo', titulo: 'Construcción de viviendas de emergencia', lugar: 'colon', dia: 10, hora: 8, horas: 10, cupo: 40,
    etiquetas: ['Urgente'],
    descripcion: 'Fin de semana de construcción junto a familias de un asentamiento de Colón. Se arma una vivienda de emergencia por cuadrilla. No hace falta experiencia: se forma a todos al llegar. Traer ropa cómoda, guantes y agua.' },
  { org: 'techo', titulo: 'Colecta TECHO: alcancía en Tres Cruces', lugar: 'tresCruces', dia: 5, hora: 10, horas: 4, cupo: 12,
    etiquetas: ['Donaciones', 'Apto programa judicial'],
    descripcion: 'Turno de colecta con alcancía en la terminal. Lo recaudado va a la construcción de las viviendas que faltan para llegar a la meta del año. Se trabaja de a parejas.' },
  { org: 'techo', titulo: 'Apoyo escolar en la comunidad', lugar: 'piedrasBlancas', dia: 3, hora: 17, horas: 2, cupo: 8,
    etiquetas: ['Apoyo escolar', 'Contacto con menores'],
    descripcion: 'Acompañamiento con deberes y lectura para niñas y niños de escuela, en el local comunitario. Requiere compromiso de al menos un mes.' },

  // Banco de Alimentos
  { org: 'bau', titulo: 'Colecta de alimentos en el Mercado Agrícola', lugar: 'mam', dia: 6, hora: 9, horas: 5, cupo: 15,
    etiquetas: ['Donaciones', 'Apto programa judicial'],
    descripcion: 'Stand de colecta de alimentos no perecederos en el MAM. Tareas: invitar a donar, recibir y clasificar lo donado y cargar las cajas.' },
  { org: 'bau', titulo: 'Día de colecta en supermercados de Pocitos', lugar: 'pocitos', dia: 13, hora: 10, horas: 4, cupo: 20,
    etiquetas: ['Donaciones'],
    descripcion: 'Turnos de 4 horas en la puerta de supermercados de Pocitos. Lo recolectado se distribuye a comedores y merenderos de la red.' },

  // Redalco
  { org: 'redalco', titulo: 'Recuperación de frutas y verduras en la UAM', lugar: 'uam', dia: 2, hora: 6, horas: 4, cupo: 10,
    etiquetas: ['Medioambiente', 'Donaciones', 'Apto programa judicial'],
    descripcion: 'Selección de frutas y verduras en buen estado que no se venden por tamaño o aspecto. Después se arman los pedidos para las organizaciones sociales que las reciben cada semana.' },
  { org: 'redalco', titulo: 'Recuperación de frutas y verduras en la UAM (turno sábado)', lugar: 'uam', dia: 9, hora: 7, horas: 4, cupo: 10,
    etiquetas: ['Medioambiente', 'Donaciones', 'Apto programa judicial'],
    descripcion: 'Mismo trabajo que el turno de semana, pensado para quienes estudian o trabajan. Calzado cerrado obligatorio.' },

  // Cruz Roja
  { org: 'cruzroja', titulo: 'Curso de primeros auxilios para voluntarios', lugar: 'plazaCagancha', dia: 4, hora: 18, horas: 3, cupo: 25,
    etiquetas: ['Apto programa judicial'],
    descripcion: 'Formación básica: RCP, atragantamiento, heridas y cómo actuar en una emergencia hasta que llega la ambulancia. Se entrega constancia de participación.' },
  { org: 'cruzroja', titulo: 'Puesto de hidratación y primeros auxilios en la rambla', lugar: 'ramblaPocitos', dia: 12, hora: 8, horas: 5, cupo: 20,
    etiquetas: ['Urgente'],
    descripcion: 'Apoyo en un puesto sanitario durante una carrera de calle: reparto de agua, orientación y asistencia al equipo de salud.' },

  // Casa Ronald McDonald
  { org: 'ronald', titulo: 'Cocinar para las familias de la Casa Ronald', lugar: 'pereiraRossell', dia: 3, hora: 18, horas: 3, cupo: 6,
    etiquetas: ['Contacto con menores'],
    descripcion: 'Un grupo cocina la cena para las familias que se alojan en la Casa mientras sus hijos están en tratamiento. Se puede venir en grupo de amigos o de trabajo.' },
  { org: 'ronald', titulo: 'Tarde de juegos en la Sala Familiar', lugar: 'pereiraRossell', dia: 8, hora: 15, horas: 2, cupo: 5,
    etiquetas: ['Contacto con menores'],
    descripcion: 'Juegos, lectura y manualidades con niñas y niños internados y sus hermanos. Se pide entrevista previa con la coordinadora.' },
  { org: 'ronald', titulo: 'Cocinar en la sala familiar de Tacuarembó', lugar: 'tacuarembo', dia: 15, hora: 11, horas: 3, cupo: 5,
    etiquetas: ['Contacto con menores'],
    descripcion: 'Almuerzo para las familias que acompañan a sus hijos en el Hospital de Tacuarembó.' },

  // Fundación Pérez Scremini
  { org: 'scremini', titulo: 'Venta de rifas en la Plaza Independencia', lugar: 'plazaIndependencia', dia: 7, hora: 11, horas: 4, cupo: 10,
    etiquetas: ['Donaciones', 'Apto programa judicial'],
    descripcion: 'Stand de venta de la rifa anual. Lo recaudado financia el tratamiento de niños y adolescentes con cáncer.' },
  { org: 'scremini', titulo: 'Acompañamiento en sala de espera de oncología pediátrica', lugar: 'pereiraRossell', dia: 5, hora: 9, horas: 3, cupo: 4,
    etiquetas: ['Contacto con menores'],
    descripcion: 'Acompañar y entretener a niñas, niños y familias mientras esperan su consulta. Requiere entrevista y capacitación previa.' },

  // Animales Sin Hogar
  { org: 'ash', titulo: 'Paseo y socialización de perros en adopción', lugar: 'ashAdopciones', dia: 1, hora: 10, horas: 3, cupo: 8,
    etiquetas: ['Apto programa judicial'],
    descripcion: 'Sacar a pasear a los perros del centro de adopciones y ayudarlos a acostumbrarse a la gente. Ideal para quienes no pueden adoptar pero quieren ayudar.' },
  { org: 'ash', titulo: 'Limpieza y mantenimiento de caniles', lugar: 'ashAdopciones', dia: 6, hora: 9, horas: 4, cupo: 6,
    etiquetas: ['Apto programa judicial'],
    descripcion: 'Limpieza, cambio de camas y arreglos chicos en el centro de adopciones. Traer ropa que se pueda ensuciar.' },
  { org: 'ash', titulo: 'Jornada de adopciones en el Parque Rodó', lugar: 'parqueRodo', dia: 13, hora: 11, horas: 5, cupo: 12,
    etiquetas: ['Donaciones'],
    descripcion: 'Feria de adopción responsable: atender a las familias interesadas, cuidar a los animales y recibir donaciones de ración.' },

  // Aldeas Infantiles SOS
  { org: 'aldeas', titulo: 'Apoyo escolar en Aldeas Infantiles', lugar: 'prado', dia: 2, hora: 16, horas: 2, cupo: 6,
    etiquetas: ['Apoyo escolar', 'Hogares de niños'],
    descripcion: 'Ayuda con deberes de primaria y liceo. Compromiso mínimo de un día por semana durante el semestre.' },
  { org: 'aldeas', titulo: 'Taller de huerta con adolescentes', lugar: 'prado', dia: 9, hora: 10, horas: 3, cupo: 8,
    etiquetas: ['Hogares de niños', 'Medioambiente'],
    descripcion: 'Armado y cuidado de una huerta orgánica junto a adolescentes. Se agradece si alguien sabe de compostaje.' },

  // El Abrojo
  { org: 'abrojo', titulo: 'Taller de alfabetización digital para jóvenes', lugar: 'cerro', dia: 4, hora: 18, horas: 2, cupo: 6,
    etiquetas: ['Apto programa judicial'],
    descripcion: 'Acompañar a jóvenes de 18 a 24 años en el uso de herramientas digitales para buscar trabajo: armar un CV, crear un correo, postularse en línea.' },
  { org: 'abrojo', titulo: 'Merienda y recreación en espacio infantil', lugar: 'laTeja', dia: 8, hora: 16, horas: 2, cupo: 6,
    etiquetas: ['Contacto con menores'],
    descripcion: 'Preparar la merienda y organizar juegos con niñas y niños del barrio.' },

  // Movimiento Tacurú
  { org: 'tacuru', titulo: 'Oratorio de los sábados en Casavalle', lugar: 'casavalle', dia: 3, hora: 14, horas: 3, cupo: 10,
    etiquetas: ['Oratorios', 'Contacto con menores'],
    descripcion: 'Juegos, deporte y merienda con niñas y niños del barrio, en el estilo de Don Bosco.' },
  { org: 'tacuru', titulo: 'Apoyo en taller de carpintería', lugar: 'casavalle', dia: 11, hora: 9, horas: 4, cupo: 4,
    etiquetas: ['Apto programa judicial'],
    descripcion: 'Ayudar al tallerista en un taller de formación laboral para adultos. Se valora experiencia con herramientas.' },

  // Huellas
  { org: 'huellas', titulo: 'Recorrida nocturna con personas en situación de calle', lugar: 'ciudadVieja', dia: 2, hora: 21, horas: 3, cupo: 8,
    etiquetas: ['Urgente'],
    descripcion: 'Recorrida por la Ciudad Vieja repartiendo comida caliente, abrigo y, sobre todo, conversación. Siempre en grupo y con una persona referente.' },
  { org: 'huellas', titulo: 'Visita a residencial de adultos mayores', lugar: 'malvin', dia: 6, hora: 15, horas: 2, cupo: 6,
    etiquetas: ['Adultos mayores', 'Apto programa judicial'],
    descripcion: 'Tarde de charla, juegos de mesa y música con las personas del residencial.' },
  { org: 'huellas', titulo: 'Comedor comunitario: servir la cena', lugar: 'cerro', dia: 10, hora: 19, horas: 2, cupo: 6,
    etiquetas: ['Ollas populares', 'Contacto con menores'],
    descripcion: 'Servir la cena y ayudar a ordenar el comedor. Asisten muchas familias con niños.' },

  // Colectivo Costa Viva (ficticia)
  { org: 'costa', titulo: 'Limpieza de la Playa Ramírez', lugar: 'playaRamirez', dia: 5, hora: 9, horas: 3, cupo: 30,
    etiquetas: ['Medioambiente', 'Apto programa judicial'],
    descripcion: 'Recolección y clasificación de residuos en la arena y la rambla. Se entregan guantes y bolsas. Al final se pesa todo lo recogido.' },
  { org: 'costa', titulo: 'Limpieza del Buceo y restauración de dunas', lugar: 'playaBuceo', dia: 12, hora: 9, horas: 3, cupo: 30,
    etiquetas: ['Medioambiente'],
    descripcion: 'Limpieza de la playa y plantación de especies nativas para recuperar la duna.' },
  { org: 'costa', titulo: 'Limpieza de la Playa del Cerro', lugar: 'playaCerro', dia: 19, hora: 9, horas: 3, cupo: 30,
    etiquetas: ['Medioambiente', 'Apto programa judicial'],
    descripcion: 'Jornada de limpieza en la Playa del Cerro con vecinos y escuelas de la zona.' },
  { org: 'costa', titulo: 'Limpieza de Playa Brava (Punta del Este)', lugar: 'playaBrava', dia: 26, hora: 10, horas: 3, cupo: 25,
    etiquetas: ['Medioambiente'],
    descripcion: 'Limpieza antes del comienzo de la temporada. Hay traslado desde Montevideo para quienes se anoten.' },
  { org: 'costa', titulo: 'Limpieza de la Playa Malvín', lugar: 'playaMalvin', dia: -10, hora: 9, horas: 3, cupo: 30,
    etiquetas: ['Medioambiente', 'Apto programa judicial'],
    descripcion: 'Jornada ya realizada: se juntaron más de 80 kg de residuos, en su mayoría plásticos y colillas.' },

  // Olla Barrial La Teja (ficticia)
  { org: 'olla', titulo: 'Olla popular: cocinar y servir', lugar: 'laTeja', dia: 1, hora: 10, horas: 4, cupo: 10,
    etiquetas: ['Ollas populares', 'Urgente', 'Apto programa judicial'],
    descripcion: 'Pelar, cocinar y servir el almuerzo. La olla da de comer a unas 150 personas del barrio.' },
  { org: 'olla', titulo: 'Recolección de donaciones para la olla', lugar: 'laTeja', dia: 4, hora: 15, horas: 3, cupo: 6,
    etiquetas: ['Donaciones', 'Ollas populares', 'Apto programa judicial'],
    descripcion: 'Recorrer comercios del barrio para pedir donaciones y llevarlas al salón comunal.' },
  { org: 'olla', titulo: 'Olla popular de fin de mes', lugar: 'laTeja', dia: -5, hora: 10, horas: 4, cupo: 10,
    etiquetas: ['Ollas populares', 'Apto programa judicial'],
    descripcion: 'Jornada ya realizada: se sirvieron 170 platos de guiso.' },

  // Animales Sin Hogar (pasada)
  { org: 'ash', titulo: 'Jornada de baño y cepillado', lugar: 'ashAdopciones', dia: -3, hora: 10, horas: 2, cupo: 8,
    etiquetas: ['Apto programa judicial'],
    descripcion: 'Jornada ya realizada: baño, cepillado y fotos para las publicaciones de adopción.' },
];

// ---------------------------------------------------------------------------------------------
// Campañas con puntos de acopio. desde/hasta = días desde hoy.
// ---------------------------------------------------------------------------------------------
const CAMPANAS = [
  { org: 'techo', titulo: 'Colecta anual TECHO', desde: -3, hasta: 30,
    objetivo: 'Juntar fondos para construir las viviendas de emergencia que faltan este año',
    descripcion: 'Voluntarios con alcancías en puntos de mucho tránsito de Montevideo. El cierre es con una cazuela solidaria en el Parque Villa Biarritz.',
    puntos: ['tresCruces', 'plazaIndependencia', 'plazaCagancha', 'pocitos', 'villaBiarritz'] },
  { org: 'bau', titulo: 'Campaña de alimentos no perecederos', desde: -7, hasta: 25,
    objetivo: 'Arroz, fideos, legumbres, aceite y leche en polvo para comedores y merenderos',
    descripcion: 'Se reciben alimentos sin abrir y con al menos 3 meses de vencimiento.',
    puntos: ['mam', 'carrasco', 'prado'] },
  { org: 'ash', titulo: 'Juntamos ración y medicamentos veterinarios', desde: -10, hasta: 40,
    objetivo: 'Ración para perros y gatos, antiparasitarios y mantas',
    descripcion: 'Toda donación ayuda a sostener a los animales que esperan adopción.',
    puntos: ['ashAdopciones', 'parqueRodo'] },
  { org: 'huellas', titulo: 'Abrigos y frazadas para la calle', desde: -2, hasta: 20,
    objetivo: 'Frazadas, camperas, medias y gorros en buen estado',
    descripcion: 'Lo que se junta se reparte en las recorridas nocturnas.',
    puntos: ['ciudadVieja', 'malvin'] },
  { org: 'olla', titulo: 'Alimentos para la olla del barrio', desde: -5, hasta: 30,
    objetivo: 'Verduras, carne, fideos y garrafas de gas',
    descripcion: 'La olla funciona dos veces por semana y siempre necesita insumos.',
    puntos: ['laTeja'] },
  { org: 'costa', titulo: 'Juntamos guantes y bolsas para las limpiezas', desde: -1, hasta: 25,
    objetivo: 'Guantes de trabajo y bolsas resistentes para las jornadas de limpieza de costas',
    descripcion: 'Si tenés guantes o bolsas que no uses, acercalos.',
    puntos: ['playaRamirez', 'playaBuceo'] },
  { org: 'scremini', titulo: 'Rifa 2026', desde: -20, hasta: 45,
    objetivo: 'Apoyar la cura del cáncer en niños y adolescentes',
    descripcion: 'Comprá o vendé números de la rifa anual. No tiene puntos de acopio: se vende en stands y en línea.',
    puntos: [] },
];

// Publicaciones del feed: [org, 'actividad' | 'campana', título del proyecto, tipo, contenido, hace cuántas horas]
const PUBLICACIONES = [
  ['techo', 'campana', 'Colecta anual TECHO', 'convocatoria', '¡Arrancó la colecta! Necesitamos gente para los turnos del fin de semana en Tres Cruces y en Pocitos. Anotate en la actividad.', 30],
  ['techo', 'campana', 'Colecta anual TECHO', 'post', 'Gracias a todas las personas que donaron el primer día. Seguimos sumando para llegar a la meta.', 6],
  ['techo', 'actividad', 'Construcción de viviendas de emergencia', 'post', 'Ya tenemos los materiales en la zona. Recuerden traer guantes y protector solar.', 20],
  ['redalco', 'actividad', 'Recuperación de frutas y verduras en la UAM', 'post', 'La semana pasada recuperamos más de 2 toneladas de frutas y verduras que iban a tirarse. ¡Gracias!', 48],
  ['ash', 'campana', 'Juntamos ración y medicamentos veterinarios', 'convocatoria', 'Nos estamos quedando sin ración para cachorros. Cualquier ayuda suma.', 12],
  ['ash', 'actividad', 'Jornada de adopciones en el Parque Rodó', 'post', 'Van a estar 25 perros y 10 gatos buscando familia. ¡Pasá aunque sea a conocerlos!', 4],
  ['costa', 'actividad', 'Limpieza de la Playa Malvín', 'post', 'Resultado de la limpieza: 82 kg de residuos, 4.000 colillas. Gracias a las 35 personas que vinieron.', 200],
  ['costa', 'actividad', 'Limpieza de la Playa Ramírez', 'convocatoria', 'Nos encontramos en la escalera frente al Parque Rodó. Hay guantes para todos.', 10],
  ['olla', 'campana', 'Alimentos para la olla del barrio', 'convocatoria', 'Esta semana necesitamos garrafas y verduras. Podés dejarlas en el salón comunal.', 18],
  ['olla', 'actividad', 'Olla popular de fin de mes', 'post', 'Servimos 170 platos. Gracias a quienes vinieron a pelar papas desde temprano.', 100],
  ['huellas', 'campana', 'Abrigos y frazadas para la calle', 'convocatoria', 'Se vienen noches frescas: priorizamos frazadas y medias.', 26],
  ['bau', 'campana', 'Campaña de alimentos no perecederos', 'post', 'Ya llevamos más de una tonelada recibida en el Mercado Agrícola.', 36],
  ['scremini', 'campana', 'Rifa 2026', 'post', 'Cada número vendido es un aporte directo al tratamiento de niñas y niños con cáncer.', 60],
  ['cruzroja', 'actividad', 'Curso de primeros auxilios para voluntarios', 'convocatoria', 'Quedan pocos lugares para el curso. Es requisito para participar en los puestos sanitarios.', 8],
];

// Inscripciones de los voluntarios demo: [índice en VOLUNTARIOS, título de la actividad, estado]
const INSCRIPCIONES = [
  [0, 'Limpieza de la Playa Ramírez', 'aceptada'], [0, 'Construcción de viviendas de emergencia', 'pendiente'],
  [0, 'Apoyo escolar en la comunidad', 'aceptada'],
  [1, 'Recuperación de frutas y verduras en la UAM', 'aceptada'], [1, 'Olla popular: cocinar y servir', 'aceptada'],
  [2, 'Cocinar para las familias de la Casa Ronald', 'aceptada'], [2, 'Jornada de adopciones en el Parque Rodó', 'pendiente'],
  [3, 'Construcción de viviendas de emergencia', 'aceptada'], [3, 'Curso de primeros auxilios para voluntarios', 'aceptada'],
  [4, 'Paseo y socialización de perros en adopción', 'aceptada'], [4, 'Limpieza de la Playa Ramírez', 'pendiente'],
  [5, 'Construcción de viviendas de emergencia', 'pendiente'], [5, 'Colecta TECHO: alcancía en Tres Cruces', 'aceptada'],
  [6, 'Oratorio de los sábados en Casavalle', 'aceptada'], [6, 'Tarde de juegos en la Sala Familiar', 'rechazada'],
  [7, 'Recorrida nocturna con personas en situación de calle', 'aceptada'], [7, 'Limpieza del Buceo y restauración de dunas', 'pendiente'],
  [8, 'Visita a residencial de adultos mayores', 'aceptada'], [8, 'Colecta de alimentos en el Mercado Agrícola', 'pendiente'],
  [9, 'Puesto de hidratación y primeros auxilios en la rambla', 'pendiente'], [9, 'Limpieza de la Playa Ramírez', 'aceptada'],
  [10, 'Apoyo escolar en Aldeas Infantiles', 'pendiente'], [10, 'Venta de rifas en la Plaza Independencia', 'aceptada'],
  [11, 'Taller de alfabetización digital para jóvenes', 'aceptada'], [11, 'Olla popular: cocinar y servir', 'pendiente'],
  // Actividades ya realizadas, con asistencia validada (sirven para ver horas y certificados)
  [0, 'Limpieza de la Playa Malvín', 'aceptada'], [1, 'Olla popular de fin de mes', 'aceptada'], [4, 'Jornada de baño y cepillado', 'aceptada'],
];

// El voluntario judicial del seed básico (SEED_JUDICIAL_EMAIL) cumple horas en estas actividades pasadas.
const JUDICIAL_PASADAS = ['Limpieza de la Playa Malvín', 'Olla popular de fin de mes', 'Jornada de baño y cepillado'];

// ---------------------------------------------------------------------------------------------

const HOY = new Date();
function fecha(dias, hora = 0) {
  const d = new Date(HOY);
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d;
}
const punto = (clave) => {
  const l = LUGARES[clave];
  if (!l) throw new Error(`Lugar desconocido: ${clave}`);
  return { type: 'Point', coordinates: [l[1], l[0]] }; // GeoJSON: [longitud, latitud]
};
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

async function main() {
  const passwordDemo = process.env.SEED_DEMO_PASSWORD;
  if (!passwordDemo || passwordDemo.length < 8) {
    throw new Error('Falta SEED_DEMO_PASSWORD en el .env (8 caracteres o más): es la contraseña de las cuentas demo');
  }
  await db.conectar(config.mongoUri);
  const hash = await bcrypt.hash(passwordDemo, config.bcryptCosto); // un solo hash para todas: es más rápido

  // Etiquetas (por si no se corrió el seed básico; no cambia las que ya existen)
  const etiquetasBase = ['Ollas populares', 'Medioambiente', 'Urgente', 'Donaciones', 'Adultos mayores', 'Apto programa judicial'];
  const sensibles = ['Apoyo escolar', 'Contacto con menores', 'Hogares de niños', 'Oratorios'];
  for (const n of etiquetasBase) await Etiqueta.updateOne({ nombre: n }, { $setOnInsert: { nombre: n, sensible: false } }, { upsert: true });
  for (const n of sensibles) await Etiqueta.updateOne({ nombre: n }, { $setOnInsert: { nombre: n, sensible: true } }, { upsert: true });
  const etiquetas = new Map((await Etiqueta.find().lean()).map((e) => [e.nombre, e._id]));
  const idsEtiquetas = (nombres) => nombres.map((n) => {
    if (!etiquetas.has(n)) throw new Error(`Etiqueta desconocida: ${n}`);
    return etiquetas.get(n);
  });

  // updateOne + findOne (y no findOneAndUpdate) porque el hash tiene select:false en el modelo.
  const upsertUsuario = async (email, datos) => {
    await Usuario.updateOne({ email }, { $set: { ...datos, passwordHash: hash, activo: true } }, { upsert: true });
    return Usuario.findOne({ email });
  };

  console.log('Organizaciones y coordinadores:');
  const orgs = {};
  const coords = {};
  for (const [clave, o] of Object.entries(ORGANIZACIONES)) {
    orgs[clave] = await Organizacion.findOneAndUpdate(
      { nombre: o.nombre },
      { $set: { contacto: o.contacto, convenioOSLA: o.convenioOSLA, activa: true } },
      { upsert: true, returnDocument: 'after' }
    );
    const [nombre, apellido] = COORDINADORES[clave];
    const email = `coord.${clave}@manoamiga.test`;
    coords[clave] = await upsertUsuario(email, { nombre, apellido, rol: 'coordinador', organizacionId: orgs[clave]._id });
    console.log(`  ✔ ${o.nombre}  →  ${email}`);
  }

  console.log('Voluntarios:');
  const voluntarios = [];
  for (const [nombre, apellido] of VOLUNTARIOS) {
    const email = `${sinTildes(nombre)}.${sinTildes(apellido)}@manoamiga.test`;
    voluntarios.push(await upsertUsuario(email, { nombre, apellido, rol: 'voluntario', organizacionId: null }));
    console.log(`  ✔ ${email}`);
  }

  console.log('Actividades:');
  const actividades = new Map();
  for (const a of ACTIVIDADES) {
    const inicio = fecha(a.dia, a.hora);
    const fin = new Date(inicio.getTime() + a.horas * 3600 * 1000);
    const doc = await Actividad.findOneAndUpdate(
      { titulo: a.titulo, organizacionId: orgs[a.org]._id },
      {
        $set: {
          descripcion: a.descripcion, creadaPor: coords[a.org]._id, etiquetas: idsEtiquetas(a.etiquetas),
          ubicacion: punto(a.lugar), direccion: LUGARES[a.lugar][2], fechaInicio: inicio, fechaFin: fin,
          cupo: a.cupo, estado: a.dia < 0 ? 'finalizada' : 'publicada',
        },
        $setOnInsert: { inscriptos: 0 },
      },
      { upsert: true, returnDocument: 'after' }
    );
    actividades.set(a.titulo, doc);
    console.log(`  ✔ ${a.titulo}`);
  }

  console.log('Campañas:');
  const campanas = new Map();
  for (const c of CAMPANAS) {
    const doc = await Campana.findOneAndUpdate(
      { titulo: c.titulo, organizacionId: orgs[c.org]._id },
      {
        $set: {
          creadaPor: coords[c.org]._id, descripcion: c.descripcion, objetivo: c.objetivo,
          puntos: c.puntos.map((p) => ({ nombre: LUGARES[p][2].split(',')[0], direccion: LUGARES[p][2], ubicacion: punto(p) })),
          fechaInicio: fecha(c.desde), fechaFin: fecha(c.hasta, 23), estado: 'activa',
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    campanas.set(c.titulo, doc);
    console.log(`  ✔ ${c.titulo} (${c.puntos.length} puntos de acopio)`);
  }

  console.log('Publicaciones:');
  for (const [org, tipoProyecto, titulo, tipo, contenido, horasAtras] of PUBLICACIONES) {
    const proyecto = tipoProyecto === 'actividad' ? actividades.get(titulo) : campanas.get(titulo);
    if (!proyecto) throw new Error(`Proyecto desconocido: ${titulo}`);
    await Publicacion.updateOne(
      { proyectoId: proyecto._id, contenido },
      {
        $set: { proyectoTipo: tipoProyecto, organizacionId: orgs[org]._id, autorId: coords[org]._id, tipo },
        $setOnInsert: { fecha: new Date(HOY.getTime() - horasAtras * 3600 * 1000) },
      },
      { upsert: true }
    );
  }
  console.log(`  ✔ ${PUBLICACIONES.length} publicaciones`);

  console.log('Inscripciones y horas:');
  const inscribir = async (voluntario, titulo, estado) => {
    const act = actividades.get(titulo);
    if (!act) throw new Error(`Actividad desconocida: ${titulo}`);
    const insc = await Inscripcion.findOneAndUpdate(
      { actividadId: act._id, voluntarioId: voluntario._id },
      { $set: { organizacionId: act.organizacionId, estado } },
      { upsert: true, returnDocument: 'after' }
    );
    if (act.estado === 'finalizada' && estado === 'aceptada') {
      const horas = Math.round((act.fechaFin - act.fechaInicio) / 360000) / 10;
      await Asistencia.updateOne(
        { inscripcionId: insc._id },
        {
          $set: {
            actividadId: act._id, voluntarioId: voluntario._id, organizacionId: act.organizacionId,
            checkIn: act.fechaInicio, checkOut: act.fechaFin, horas, metodo: 'manual',
            estado: 'validada', validadaPor: act.creadaPor, validadaEn: act.fechaFin,
          },
        },
        { upsert: true }
      );
    }
  };
  for (const [i, titulo, estado] of INSCRIPCIONES) await inscribir(voluntarios[i], titulo, estado);

  const judicial = process.env.SEED_JUDICIAL_EMAIL
    ? await Usuario.findOne({ email: process.env.SEED_JUDICIAL_EMAIL.toLowerCase(), esJudicial: true })
    : null;
  if (judicial) {
    for (const titulo of JUDICIAL_PASADAS) await inscribir(judicial, titulo, 'aceptada');
    console.log(`  ✔ ${judicial.email}: horas validadas en ${JUDICIAL_PASADAS.length} actividades`);
  } else {
    console.log('  (no se encontró el voluntario judicial del seed básico: se saltean sus horas)');
  }

  // El contador de cupo se recalcula a partir de las inscripciones vigentes, así nunca queda desfasado.
  for (const act of actividades.values()) {
    const ocupados = await Inscripcion.countDocuments({ actividadId: act._id, estado: { $in: ['pendiente', 'aceptada'] } });
    await Actividad.updateOne({ _id: act._id }, { $set: { inscriptos: ocupados } });
  }
  console.log(`  ✔ ${INSCRIPCIONES.length} inscripciones de voluntarios demo`);

  await db.desconectar();
  console.log(`Listo: ${Object.keys(ORGANIZACIONES).length} organizaciones, ${ACTIVIDADES.length} actividades, ${CAMPANAS.length} campañas.`);
}

main().catch(async (err) => {
  console.error('Error en el seed demo:', err.message);
  await db.desconectar().catch(() => {});
  process.exit(1);
});