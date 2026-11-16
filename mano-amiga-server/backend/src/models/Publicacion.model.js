const { Schema, model } = require('mongoose');

// Feed de cada proyecto. Un "proyecto" es una actividad o una campaña.
const publicacionSchema = new Schema(
  {
    proyectoId: { type: Schema.Types.ObjectId, required: true },
    proyectoTipo: { type: String, enum: ['actividad', 'campana'], required: true },
    organizacionId: { type: Schema.Types.ObjectId, ref: 'Organizacion', required: true },
    autorId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    tipo: { type: String, enum: ['post', 'convocatoria'], default: 'post' }, // "convocatoria" ya no se crea (queda por datos viejos)
    // Dónde se muestra: "novedad" = Novedades de la actividad/campaña (públicas); "perfil" = fotos en el perfil de la organización.
    destino: { type: String, enum: ['novedad', 'perfil'], default: 'novedad' },
    contenido: { type: String, required: true, trim: true, maxlength: 2000 },
    fotos: { type: [{ type: Schema.Types.ObjectId, ref: 'Archivo' }], default: [] },
    fecha: { type: Date, default: Date.now },
  },
  { collection: 'publicaciones' }
);

publicacionSchema.index({ proyectoId: 1, fecha: -1 });
publicacionSchema.index({ organizacionId: 1, fecha: -1 });

module.exports = model('Publicacion', publicacionSchema);
