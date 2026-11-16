const { Schema, model } = require('mongoose');

/*
 "Mi historia": el anuario del voluntario. Una historia por actividad a la que fue
 (tiene una asistencia registrada). El relato y las fotos los pone el propio voluntario;
 la fecha, el lugar y la organización salen de la actividad.
 */
const historiaSchema = new Schema(
  {
    voluntarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    actividadId: { type: Schema.Types.ObjectId, ref: 'Actividad', required: true },
    organizacionId: { type: Schema.Types.ObjectId, ref: 'Organizacion', required: true },
    asistenciaId: { type: Schema.Types.ObjectId, ref: 'Asistencia', required: true },
    relato: { type: String, trim: true, maxlength: 1000, default: '' },
    fotos: { type: [{ type: Schema.Types.ObjectId, ref: 'Archivo' }], default: [] },
  },
  { timestamps: true, collection: 'historias' }
);
historiaSchema.index({ voluntarioId: 1, actividadId: 1 }, { unique: true });

module.exports = model('Historia', historiaSchema);
