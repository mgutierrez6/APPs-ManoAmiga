/**
 * Migración del Sprint 4 (rediseño):  npm run migrar:sprint4
 *
 * No borra nada ni toca datos de personas. Solo:
 *  1. Marca qué etiquetas son "características" (Urgente, Apto programa judicial, Contacto con menores);
 *     el resto queda como "tipo" de actividad (color e ícono en la app).
 *     Además crea el tipo "Otros" y se lo asigna a las actividades que no tenían ningún tipo.
 *  2. Crea los índices de las colecciones nuevas (historias, archivos) y el nuevo de publicaciones.
 *
 * Los campos nuevos (foto de perfil, perfil de la organización, fotos de publicaciones, cupo ilimitado)
 * no necesitan migración: los documentos viejos simplemente no los tienen y la API usa el valor por defecto.
 * Es idempotente: se puede correr varias veces.
 */
const config = require('../config/env');
const db = require('../config/db');
const { Etiqueta, Historia, Archivo, Publicacion, Actividad } = require('../models');

const CARACTERISTICAS = ['Urgente', 'Apto programa judicial', 'Contacto con menores'];

async function main() {
  await db.conectar(config.mongoUri);

  const car = await Etiqueta.updateMany({ nombre: { $in: CARACTERISTICAS } }, { $set: { clase: 'caracteristica' } });
  const tipos = await Etiqueta.updateMany({ nombre: { $nin: CARACTERISTICAS }, clase: { $ne: 'tipo' } }, { $set: { clase: 'tipo' } });
  console.log(`Etiquetas: ${car.modifiedCount} marcadas como característica, ${tipos.modifiedCount} como tipo.`);

  // Tipo "Otros" (celeste en la app): para las actividades que no tienen ninguno de los demás tipos.
  const otros = await Etiqueta.findOneAndUpdate(
    { nombre: 'Otros' },
    { $setOnInsert: { nombre: 'Otros', sensible: false }, $set: { clase: 'tipo' } },
    { upsert: true, returnDocument: 'after' }
  );
  const idsTipo = await Etiqueta.find({ clase: 'tipo' }).distinct('_id');
  const sinTipo = await Actividad.updateMany({ etiquetas: { $nin: idsTipo } }, { $push: { etiquetas: otros._id } });
  console.log(`Actividades sin tipo que pasaron a "Otros": ${sinTipo.modifiedCount}.`);

  // Publicaciones viejas sin "destino": las que tienen fotos y se subieron después de que terminó la actividad
  // son del perfil de la organización; el resto son novedades.
  const sinDestino = await Publicacion.find({ destino: { $exists: false } }).select('proyectoId proyectoTipo fotos fecha').lean();
  const fines = new Map((await Actividad.find({ _id: { $in: sinDestino.map((p) => p.proyectoId) } }).select('fechaFin').lean()).map((a) => [String(a._id), a.fechaFin]));
  let aPerfil = 0;
  for (const p of sinDestino) {
    const fin = fines.get(String(p.proyectoId));
    const esPerfil = p.proyectoTipo === 'actividad' && (p.fotos || []).length > 0 && fin && new Date(p.fecha) >= new Date(fin);
    if (esPerfil) aPerfil += 1;
    await Publicacion.updateOne({ _id: p._id }, { $set: { destino: esPerfil ? 'perfil' : 'novedad' } });
  }
  console.log(`Publicaciones: ${sinDestino.length} sin destino → ${aPerfil} al perfil de la organización, el resto a Novedades.`);

  for (const modelo of [Historia, Archivo, Publicacion]) await modelo.syncIndexes();
  console.log('Índices creados: historias, archivos, publicaciones.');

  await db.desconectar();
  console.log('Listo.');
}

main().catch(async (err) => {
  console.error('Error en la migración:', err.message);
  await db.desconectar().catch(() => {});
  process.exit(1);
});
