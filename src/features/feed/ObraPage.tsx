import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, extraerMensajeError } from '../../lib/api';
import type { PublicacionDto } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
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

  if (error) return <p className="banner-error mx-auto my-16 max-w-xl text-center">{error}</p>;
  if (!obra) return <Skeleton filas={1} className="mx-auto max-w-6xl px-4 py-6" claseFila="h-[70vh]" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PostCard variante="detalle" publicacion={obra} onEliminada={() => navigate('/feed')} />
    </div>
  );
}
