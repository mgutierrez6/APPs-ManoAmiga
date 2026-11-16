const { Schema, model } = require('mongoose');

// Punto GeoJSON: OJO, el orden es [longitud, latitud].
const puntoSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const actividadSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true, maxlength: 100 },
    descripcion: { type: String, required: true, trim: true, maxlength: 2000 },
    organizacionId: { type: Schema.Types.ObjectId, ref: 'Organizacion', required: true },
    creadaPor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    etiquetas: [{ type: Schema.Types.ObjectId, ref: 'Etiqueta' }],
    ubicacion: { type: puntoSchema, required: true }, // ubicación INSTITUCIONAL (RS7), nunca la de un voluntario
    direccion: { type: String, trim: true, maxlength: 200 },
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    cupo: { type: Number, min: 1, default: null }, // null = cupos ilimitados
    inscriptos: { type: Number, default: 0, min: 0 }, // contador para reservar cupo de forma atómica
    estado: { type: String, enum: ['publicada', 'cancelada', 'finalizada'], default: 'publicada' },
  },
  { timestamps: true, collection: 'actividades' }
);

actividadSchema.index({ ubicacion: '2dsphere' });
actividadSchema.index({ organizacionId: 1 });
actividadSchema.index({ etiquetas: 1 });

module.exports = model('Actividad', actividadSchema);
module.exports.puntoSchema = puntoSchema;
