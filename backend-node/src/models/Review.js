import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Subdocumento: Respuesta anidada a una reseña.
 */
const ReplySchema = new Schema(
  {
    userId:    { type: String, required: true },
    userName:  { type: String, required: true },
    comment:   { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/**
 * Esquema principal de Reseña.
 * mediaItemId referencia al ID del MediaItem en PostgreSQL (gestionado por Django).
 */
const ReviewSchema = new Schema(
  {
    mediaItemId: {
      type:     Number,
      required: true,
      index:    true,
    },
    userId: {
      type:     String,
      required: true,
      index:    true,
    },
    userName: {
      type:     String,
      required: true,
    },
    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      10,
    },
    comment: {
      type:      String,
      required:  true,
      maxlength: 2000,
    },
    isSpoiler: {
      type:    Boolean,
      default: false,
    },
    replies: [ReplySchema],
    createdAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    // Deshabilitar timestamps automático de Mongoose; lo manejamos manualmente.
    timestamps: false,
    versionKey: false,
  }
);

// Índice compuesto para listar reseñas por obra ordenadas por fecha descendente.
ReviewSchema.index({ mediaItemId: 1, createdAt: -1 });

const Review = mongoose.model('Review', ReviewSchema);

export default Review;

