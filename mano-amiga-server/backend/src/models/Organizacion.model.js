const { Schema, model } = require('mongoose');

const organizacionSchema = new Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    contacto: { type: String, trim: true, maxlength: 120 },
    convenioOSLA: { type: Boolean, default: false },
    // Si la organización se da de baja, sus coordinadores pierden acceso en el siguiente pedido (RS5).
    activa: { type: Boolean, default: true },
    // Perfil público de la organización (lo completan sus coordinadores).
    descripcion: { type: String, trim: true, maxlength: 500, default: '' },
    rubro: { type: String, trim: true, maxlength: 60, default: '' },
    zona: { type: String, trim: true, maxlength: 60, default: '' },
    logoId: { type: Schema.Types.ObjectId, ref: 'Archivo', default: null },
    portadaId: { type: Schema.Types.ObjectId, ref: 'Archivo', default: null },
  },
  { timestamps: true, collection: 'organizaciones' }
);

module.exports = model('Organizacion', organizacionSchema);
