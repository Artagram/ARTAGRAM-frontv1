import { useEffect, useState } from 'react';
import { api, extraerMensajeError } from '../../lib/api';
import type { ComunidadRecomendadaDto } from '../../types';

/**
 * "Comunidades para ti" (GET /api/comunidades/recomendadas, ver contrato).
 * Unirse usa el endpoint que ya existe; al unirse, la comunidad sale de la
 * lista y quien la usa recarga "mis comunidades".
 */
export function ComunidadesRecomendadas({ onUnido }: { onUnido: () => void }) {
  const [comunidades, setComunidades] = useState<ComunidadRecomendadaDto[]>([]);
  const [uniendo, setUniendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    api
      .get<ComunidadRecomendadaDto[]>('/api/comunidades/recomendadas', { params: { limite: 5 }, signal: controlador.signal })
      .then((r) => setComunidades(r.data))
      .catch(() => {});
    return () => controlador.abort();
  }, []);

  async function unirse(id: string) {
    setUniendo(id);
    setError(null);
    try {
      await api.post(`/api/comunidades/${id}/miembros`);
      setComunidades((prev) => prev.filter((c) => c.id !== id));
      onUnido();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo unir a la comunidad'));
    } finally {
      setUniendo(null);
    }
  }

  if (comunidades.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="titulo-comunidades-recomendadas">
      <h2 id="titulo-comunidades-recomendadas" className="mb-3 font-display text-lg font-semibold">
        Comunidades para ti
      </h2>
      {error && <p className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {comunidades.map((c) => (
          <li key={c.id} className="card flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{c.nombre}</h3>
              <span className="shrink-0 text-[11px] text-paper-dim">
                {c.totalMiembros} {c.totalMiembros === 1 ? 'miembro' : 'miembros'}
              </span>
            </div>
            {c.descripcion && <p className="line-clamp-2 text-sm text-paper-muted">{c.descripcion}</p>}
            <p className="text-[11px] text-violet">{c.motivo}</p>
            <button
              type="button"
              onClick={() => void unirse(c.id)}
              disabled={uniendo === c.id}
              className="btn-secondary mt-auto self-start px-3 py-1 text-xs"
            >
              {uniendo === c.id ? 'Uniéndote…' : 'Unirme'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
