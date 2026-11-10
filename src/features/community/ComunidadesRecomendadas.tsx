import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import type { ComunidadResponse } from '../../types';

const COMUNIDADES_VISIBLES = 6;

export function ComunidadesRecomendadas({ onUnida }: { onUnida: () => void }) {
  const [comunidades, setComunidades] = useState<ComunidadResponse[]>([]);
  const [uniendo, setUniendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ComunidadResponse[]>('/api/comunidades/recomendadas', { params: { limite: COMUNIDADES_VISIBLES } })
      .then((r) => setComunidades(r.data))
      .catch(() => undefined);
  }, []);

  async function unirse(id: string) {
    setUniendo(id);
    setError(null);
    try {
      await api.post(`/api/comunidades/${id}/miembros`);
      setComunidades((prev) => prev.filter((c) => c.id !== id));
      onUnida();
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos unirte a la comunidad'));
    } finally {
      setUniendo(null);
    }
  }

  if (comunidades.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 font-display text-lg font-semibold">Comunidades recomendadas</h2>
      {error && <p className="mb-3 banner-error">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comunidades.map((c) => (
          <div key={c.id} className="card flex h-full flex-col p-5">
            <Link to={`/comunidades/${c.id}`} className="group flex-1">
              <p className="text-xs text-paper-dim">
                {c.totalMiembros} {c.totalMiembros === 1 ? 'miembro' : 'miembros'}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold group-hover:text-coral">{c.nombre}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-paper-muted">{c.descripcion || 'Sin descripción'}</p>
            </Link>
            <Button variant="secondary" className="mt-3 self-start" cargando={uniendo === c.id} disabled={uniendo !== null} onClick={() => unirse(c.id)}>
              Unirme
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
