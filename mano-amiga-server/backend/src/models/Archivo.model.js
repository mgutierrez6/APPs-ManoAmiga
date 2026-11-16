const { Schema, model } = require('mongoose');

/*
 Fotos subidas a la app (perfil, organización, publicaciones e historias).
 La imagen se guarda en disco (carpeta UPLOADS_DIR, nombre = _id). En Mongo solo queda este registro:
 quién la subió, para qué y su tipo. Así se puede controlar que nadie use la foto de otra persona
 y que las fotos de "Mi historia" solo las vea su dueño.
 */
const USOS = ['perfil', 'organizacion', 'publicacion', 'historia'];

const archivoSchema = new Schema(
  {
    autorId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    uso: { type: String, enum: USOS, required: true },
    // Solo en fotos de organización y publicaciones: la organización del coordinador que la subió.
    organizacionId: { type: Schema.Types.ObjectId, ref: 'Organizacion', default: null },
    tipo: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    tamano: { type: Number, required: true, min: 1 },
    creadoEn: { type: Date, default: Date.now },
  },
  { collection: 'archivos' }
);
archivoSchema.index({ autorId: 1, creadoEn: -1 });

module.exports = model('Archivo', archivoSchema);
module.exports.USOS = USOS;
