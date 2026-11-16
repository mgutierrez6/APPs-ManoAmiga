const { Schema, model } = require('mongoose');

// sensible = true -> un voluntario judicial no ve ni puede inscribirse a actividades con esta etiqueta (ABAC).
const etiquetaSchema = new Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    sensible: { type: Boolean, default: false },
    // 'tipo' = tipo de actividad (tiene color e ícono en la app); 'caracteristica' = dato extra (Urgente, Apto judicial...).
    clase: { type: String, enum: ['tipo', 'caracteristica'], default: 'tipo' },
  },
  { collection: 'etiquetas' }
);

module.exports = model('Etiqueta', etiquetaSchema);
