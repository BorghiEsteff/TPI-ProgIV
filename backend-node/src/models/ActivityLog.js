import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Esquema de Registro de Actividades / Auditoría de la Capa Social.
 * Registra acciones relevantes como creación/actualización/eliminación de reseñas y comentarios.
 */
const ActivityLogSchema = new Schema(
  {
    userId: {
      type:     String,
      required: true,
      index:    true,
    },
    action: {
      type:     String,
      required: true,
      enum:     ['CREATE_REVIEW', 'UPDATE_REVIEW', 'DELETE_REVIEW', 'ADD_REPLY'],
    },
    targetType: {
      type:     String,
      required: true,
      default:  'Review',
    },
    targetId: {
      type:     Schema.Types.ObjectId,
      ref:      'Review',
      required: true,
      index:    true,
    },
    metadata: {
      type:    Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type:    Date,
      default: Date.now,
      index:   true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

export default ActivityLog;
