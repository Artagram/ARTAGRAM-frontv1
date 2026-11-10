import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { recomendarArtistas, type ArtistaRecomendado } from '../../lib/recomendaciones';
import { BotonSeguir } from './BotonSeguir';
import type { ArtistaResumen, FeedResponse, Seguimiento } from '../../types';

const CANDIDATOS = 10;
const MOSTRADOS = 4;

interface Recomendacion extends ArtistaRecomendado {
  loSigo: boolean;
  seguidores: number;
}

/**
 * "Artistas que quizás te gusten". El backend no tiene recomendaciones: se
 * calculan con las obras de explorar (ver recomendarArtistas) y luego se
 * consulta a artagram-users cuáles ya sigues, porque no hay un endpoint que
 * liste a quién sigue el usuario.
 */
export function ArtistasRecomendados({ onSeguimientoCambiado }: { onSeguimientoCambiado: () => void }) {
  const miId = useAuthStore((s) => s.sesion?.usuarioId);
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!miId) return;
    const controlador = new AbortController();
    (async () => {
      try {
        const { data } = await api.get<FeedResponse>('/api/feed/explorar', {
          params: { pagina: 0, tamano: 30 },
          signal: controlador.signal,
        });
        const candidatos = recomendarArtistas(data.publicaciones, miId, new Set(), CANDIDATOS);
        const conEstado = await Promise.all(
          candidatos.map(async (c) => {
            try {
              const { data: a } = await api.get<ArtistaResumen>(`/api/artistas/${c.autorId}`, { signal: controlador.signal });
              return { ...c, loSigo: a.loSigo, seguidores: a.seguidores };
            } catch {
              return null;
            }
          }),
        );
        setRecomendaciones(conEstado.filter((r): r is Recomendacion => !!r && !r.loSigo).slice(0, MOSTRADOS));
      } catch {
        // sin recomendaciones no se muestra la sección
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    })();
    return () => controlador.abort();
  }, [miId]);

  function alCambiar(autorId: string, seguimiento: Seguimiento) {
    setRecomendaciones((prev) => prev.map((r) => (r.autorId === autorId ? { ...r, ...seguimiento } : r)));
    onSeguimientoCambiado();
  }

  if (cargando || recomendaciones.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-ink-700 bg-ink-900/40 p-4" aria-labelledby="titulo-recomendados">
      <h2 id="titulo-recomendados" className="mb-2 text-sm font-semibold">
        Artistas que quizás te gusten
      </h2>
      <ul className="flex flex-col divide-y divide-ink-800">
        {recomendaciones.map((r) => (
          <li key={r.autorId} className="flex items-center justify-between gap-3 py-2">
            <Link to={`/perfil/${r.autorNombre}`} className="flex min-w-0 items-center gap-3 hover:text-coral">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-700 text-xs font-semibold uppercase">
                {r.autorNombre.slice(0, 2)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.autorNombre}</span>
                <span className="block truncate text-[11px] text-paper-dim">
                  {r.motivo} · {r.seguidores} {r.seguidores === 1 ? 'seguidor' : 'seguidores'}
                </span>
              </span>
            </Link>
            <BotonSeguir
              usuarioId={r.autorId}
              loSigo={r.loSigo}
              onCambio={(s) => alCambiar(r.autorId, s)}
              className="text-xs px-3 py-1"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
