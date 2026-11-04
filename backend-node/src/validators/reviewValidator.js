import { z } from 'zod';

/**
 * Schema Zod para la creación de una reseña.
 */
export const createReviewSchema = z.object({
  mediaItemId: z
    .number({ required_error: 'mediaItemId es requerido', invalid_type_error: 'mediaItemId debe ser un número' })
    .int()
    .positive('mediaItemId debe ser un entero positivo'),

  userId: z
    .string({ required_error: 'userId es requerido' })
    .min(1, 'userId no puede estar vacío'),

  userName: z
    .string({ required_error: 'userName es requerido' })
    .min(1, 'userName no puede estar vacío'),

  rating: z
    .number({ required_error: 'rating es requerido', invalid_type_error: 'rating debe ser un número' })
    .int('rating debe ser un número entero')
    .min(1, 'rating mínimo es 1')
    .max(10, 'rating máximo es 10'),

  comment: z
    .string({ required_error: 'comment es requerido' })
    .min(1, 'comment no puede estar vacío')
    .max(2000, 'comment no puede superar los 2000 caracteres'),

  isSpoiler: z.boolean().optional().default(false),
});

/**
 * Schema Zod para la actualización parcial/total de una reseña existente.
 */
export const updateReviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: 'rating debe ser un número' })
    .int('rating debe ser un número entero')
    .min(1, 'rating mínimo es 1')
    .max(10, 'rating máximo es 10')
    .optional(),

  comment: z
    .string()
    .min(1, 'comment no puede estar vacío')
    .max(2000, 'comment no puede superar los 2000 caracteres')
    .optional(),

  isSpoiler: z.boolean().optional(),
}).refine((data) => data.rating !== undefined || data.comment !== undefined || data.isSpoiler !== undefined, {
  message: 'Debe proporcionar al menos un campo para actualizar (rating, comment o isSpoiler)',
});

/**
 * Schema Zod para agregar una respuesta anidada (reply) a una reseña.
 */
export const createReplySchema = z.object({
  userId: z
    .string({ required_error: 'userId es requerido' })
    .min(1, 'userId no puede estar vacío'),

  userName: z
    .string({ required_error: 'userName es requerido' })
    .min(1, 'userName no puede estar vacío'),

  comment: z
    .string({ required_error: 'comment es requerido' })
    .min(1, 'comment no puede estar vacío')
    .max(2000, 'comment no puede superar los 2000 caracteres'),
});
