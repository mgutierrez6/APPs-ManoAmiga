const { Schema, model } = require('mongoose');

/*
 Chat de una actividad. Solo lo leen y escriben los inscriptos ACEPTADOS y los coordinadores de la
 organización dueña (se controla en chat.service). Un mensaje borrado no se elimina: queda marcado
 y la API ya no devuelve su texto ("Mensaje eliminado").
 */
const mensajeSchema = new Schema(
  {
    actividadId: { type: Schema.Types.ObjectId, ref: 'Actividad', required: true },
    organizacionId: { type: Schema.Types.ObjectId, ref: 'Organizacion', required: true },
    autorId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    texto: { type: String, required: true, trim: true, maxlength: 1000 },
    borrado: { type: Boolean, default: false },
    borradoPor: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fecha: { type: Date, default: Date.now },
  },
  { collection: 'mensajes' }
);

mensajeSchema.index({ actividadId: 1, fecha: 1 });
mensajeSchema.index({ autorId: 1, fecha: -1 });

module.exports = model('Mensaje', mensajeSchema);
