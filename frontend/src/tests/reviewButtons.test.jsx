import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ReplyThread from '../components/reviews/ReplyThread';
import ReviewForm from '../components/reviews/ReviewForm';
import ReviewItem from '../components/reviews/ReviewItem';

describe('Botones de Resenas, Spoilers, RBAC y Respuestas', () => {
  const sampleReview = {
    _id: 'rev-123',
    mediaItemId: 5,
    userId: '10',
    userName: 'critico_experto',
    rating: 9,
    comment: 'El protagonista descubre la verdad en el episodio final.',
    isSpoiler: true,
    hasSpoilers: true,
    sentiment: 'POSITIVE',
    createdAt: '2026-11-10T18:00:00Z',
    replies: [],
  };

  it('oculta spoilers inicialmente y alterna visibilidad con Mostrar / Ocultar spoiler', async () => {
    const user = userEvent.setup();

    render(
      <ReviewItem
        review={sampleReview}
        currentUser={{ id: 99, role: 'USER' }}
        isAuthenticated={true}
      />
    );

    expect(
      screen.queryByText(sampleReview.comment)
    ).not.toBeInTheDocument();

    const showBtn = screen.getByRole('button', {
      name: 'Mostrar contenido con spoiler',
    });
    await user.click(showBtn);

    expect(screen.getByText(sampleReview.comment)).toBeInTheDocument();

    const hideBtn = screen.getByRole('button', { name: 'Ocultar spoiler' });
    await user.click(hideBtn);

    expect(
      screen.queryByText(sampleReview.comment)
    ).not.toBeInTheDocument();
  });

  it('aplica control de autoria y RBAC en botones Editar y Eliminar', async () => {
    const user = userEvent.setup();
    const onUpdateReview = vi.fn();
    const onDeleteReview = vi.fn();

    // Usuario ajeno con rol USER: no ve Editar ni Eliminar
    const { rerender } = render(
      <ReviewItem
        review={sampleReview}
        currentUser={{ id: 99, role: 'USER' }}
        isAuthenticated={true}
        onUpdateReview={onUpdateReview}
        onDeleteReview={onDeleteReview}
      />
    );

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();

    // Autor original: ve Editar y Eliminar y puede usarlos
    rerender(
      <ReviewItem
        review={sampleReview}
        currentUser={{ id: 10, role: 'CRITIC' }}
        isAuthenticated={true}
        onUpdateReview={onUpdateReview}
        onDeleteReview={onDeleteReview}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onDeleteReview).toHaveBeenCalledWith(sampleReview);

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onUpdateReview).toHaveBeenCalledWith('rev-123', {
      rating: 9,
      comment: sampleReview.comment,
      isSpoiler: true,
    });

    // Rol ADMIN aunque no sea autor: tambien ve Editar y Eliminar
    rerender(
      <ReviewItem
        review={sampleReview}
        currentUser={{ id: 1, role: 'ADMIN' }}
        isAuthenticated={true}
        onUpdateReview={onUpdateReview}
        onDeleteReview={onDeleteReview}
      />
    );

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('ReviewForm deshabilita envio durante carga y dispara onSubmitReview al completar', async () => {
    const user = userEvent.setup();
    const onSubmitReview = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ReviewForm isSubmitting={false} onSubmitReview={onSubmitReview} />
    );

    // Con comentario vacio, no dispara callback
    await user.click(screen.getByRole('button', { name: 'Publicar Resena' }));
    expect(onSubmitReview).not.toHaveBeenCalled();

    const textarea = screen.getByPlaceholderText(/Comparta su opinion/i);
    await user.type(textarea, 'Excelente direccion fotografica.');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publicar Resena' }));

    expect(onSubmitReview).toHaveBeenCalledWith({
      rating: 8,
      comment: 'Excelente direccion fotografica.',
      isSpoiler: true,
    });

    rerender(<ReviewForm isSubmitting={true} onSubmitReview={onSubmitReview} />);
    expect(screen.getByRole('button', { name: /Publicando/i })).toBeDisabled();
  });

  it('ReplyThread envia respuesta y deshabilita boton mientras isSubmitting es true', async () => {
    const user = userEvent.setup();
    const onAddReply = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ReplyThread
        reviewId="rev-123"
        replies={[]}
        isAuthenticated={true}
        isSubmitting={false}
        onAddReply={onAddReply}
      />
    );

    const input = screen.getByPlaceholderText('Escribir una respuesta...');
    await user.type(input, 'Coincido totalmente con tu analisis.');
    await user.click(screen.getByRole('button', { name: 'Responder' }));

    expect(onAddReply).toHaveBeenCalledWith(
      'rev-123',
      'Coincido totalmente con tu analisis.'
    );

    rerender(
      <ReplyThread
        reviewId="rev-123"
        replies={[]}
        isAuthenticated={true}
        isSubmitting={true}
        onAddReply={onAddReply}
      />
    );

    const submitButtons = screen.getAllByRole('button');
    expect(submitButtons[0]).toBeDisabled();
  });
});

