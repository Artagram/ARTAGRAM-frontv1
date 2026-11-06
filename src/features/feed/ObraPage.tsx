import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, extraerMensajeError } from '../../lib/api';
import type { PublicacionDto } from '../../types';
import { PostCard } from './PostCard';

export function ObraPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState<PublicacionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PublicacionDto>(`/api/publicaciones/${id}`)
      .then(({ data }) => setObra(data))
      .catch((err) => setError(extraerMensajeError(err, 'No pudimos cargar esta obra')));
  }, [id]);

  if (error) return <p className="mx-auto max-w-xl px-4 py-16 text-center text-coral-light">{error}</p>;
  if (!obra) return <p className="p-16 text-center text-paper-muted">Cargando…</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PostCard publicacion={obra} onEliminada={() => navigate('/feed')} />
    </div>
  );
}
