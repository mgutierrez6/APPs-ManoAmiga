const { Schema, model } = require('mongoose');

/*
 Avisos de la campanita (dentro de la app). Cada aviso es de UNA persona (usuarioId) y solo lo ve ella (RS2).
 El texto nunca lleva datos personales (ni teléfono, ni condición judicial).
 Los mensajes del chat se agrupan: un solo aviso sin leer por actividad, con la cantidad de mensajes nuevos.
 Se borran solos a los 90 días.
 */
const TIPOS = ['inscripcion_aceptada', 'inscripcion_rechazada', 'actividad_cancelada', 'actividad_cambiada', 'novedad', 'chat'];

const notificacionSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    tipo: { type: String, enum: TIPOS, required: true },
    titulo: { type: String, required: true, maxlength: 200 },
    texto: { type: String, required: true, maxlength: 300 },
    actividadId: { type: Schema.Types.ObjectId, ref: 'Actividad', default: null },
    cantidad: { type: Number, default: 1 }, // solo en "chat": mensajes nuevos agrupados
    leida: { type: Boolean, default: false },
    fecha: { type: Date, default: Date.now },
  },
  { collection: 'notificaciones' }
);

notificacionSchema.index({ usuarioId: 1, fecha: -1 });
notificacionSchema.index({ usuarioId: 1, leida: 1 });
notificacionSchema.index({ fecha: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = model('Notificacion', notificacionSchema);
module.exports.TIPOS = TIPOS;
