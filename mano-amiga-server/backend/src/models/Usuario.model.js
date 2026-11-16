const { Schema, model } = require('mongoose');

const ROLES = ['voluntario', 'coordinador', 'admin'];

const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 60 },
    apellido: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    // select:false -> el hash nunca sale en una consulta salvo que se pida explícitamente.
    passwordHash: { type: String, required: true, select: false },
    telefono: { type: String, trim: true, maxlength: 20 },
    rol: { type: String, enum: ROLES, default: 'voluntario', required: true },
    organizacionId: { type: Schema.Types.ObjectId, ref: 'Organizacion', default: null },
    // Atributo ABAC: NO es un rol aparte. Solo lo cambia el administrador (Sprint 2, R7).
    esJudicial: { type: Boolean, default: false },
    horasAsignadas: { type: Number, default: 0, min: 0 },
    activo: { type: Boolean, default: true },
    preferencias: {
      tema: { type: String, enum: ['sistema', 'claro', 'oscuro'], default: 'sistema' },
    },
    pushTokens: { type: [String], default: [], select: false },
    // Foto de perfil (opcional). Es un Archivo subido por la misma persona.
    fotoId: { type: Schema.Types.ObjectId, ref: 'Archivo', default: null },
  },
  { timestamps: true, collection: 'usuarios' }
);

module.exports = model('Usuario', usuarioSchema);
module.exports.ROLES = ROLES;
