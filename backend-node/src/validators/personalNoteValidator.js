export const validatePersonalNoteInput = (body = {}) => {
  const errors = {};
  let rating = null;

  if (body.rating !== undefined && body.rating !== null && body.rating !== '') {
    if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      errors.rating = 'La puntuación debe ser un número entero entre 1 y 5, o null.';
    } else {
      rating = body.rating;
    }
  }

  let comment = '';
  if (body.comment !== undefined && body.comment !== null) {
    if (typeof body.comment !== 'string') {
      errors.comment = 'El comentario debe ser una cadena de texto.';
    } else if (body.comment.length > 2000) {
      errors.comment = 'El comentario no puede superar los 2000 caracteres.';
    } else {
      comment = body.comment;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { rating, comment },
  };
};
