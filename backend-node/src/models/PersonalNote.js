import mongoose from 'mongoose';

const personalNoteSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: true,
      index: true,
    },
    trackingEntryId: {
      type: Number,
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      default: null,
      validate: {
        validator: (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5),
        message: 'La puntuación privada debe ser un entero entre 1 y 5 o null.',
      },
    },
    comment: {
      type: String,
      default: '',
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    collection: 'personal_notes',
  }
);

personalNoteSchema.index({ ownerUserId: 1, trackingEntryId: 1 }, { unique: true });

const PersonalNote = mongoose.model('PersonalNote', personalNoteSchema);

export default PersonalNote;
