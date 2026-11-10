import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { stompService } from '../../lib/stompClient';
import { aplicarEventoPresencia } from '../../lib/presencia';
import type { ArtistaDibujandoDto, PresenciaEvento } from '../../types';

function descripcionLugar(a: ArtistaDibujandoDto): string {
  if (a.lugar === 'FIESTA') return 'en una sala de fiesta';
  return a.comunidadNombre ? `en ${a.comunidadNombre}` : 'en una comunidad privada';
}

/**
 * Franja "Dibujando ahora" con los artistas seguidos que están en un lienzo o
 * sala (GET /api/presencia/seguidos + /user/queue/presencia, ver contrato).
 */
export function SeguidosDibujando() {
  const token = useAuthStore((s) => s.sesion?.accessToken);
  const [artistas, setArtistas] = useState<ArtistaDibujandoDto[]>([]);

  useEffect(() => {
    if (!token) return;
    const controlador = new AbortController();
    api
      .get<ArtistaDibujandoDto[]>('/api/presencia/seguidos', { signal: controlador.signal })
      .then((r) => setArtistas(r.data))
      .catch(() => {});

    stompService.conectar(token);
    const desuscribir = stompService.suscribir<PresenciaEvento>('/user/queue/presencia', (evento) =>
      setArtistas((prev) => aplicarEventoPresencia(prev, evento)),
    );
    return () => {
      controlador.abort();
      desuscribir();
    };
  }, [token]);

  if (artistas.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4" aria-labelledby="titulo-dibujando">
      <h2 id="titulo-dibujando" className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        Dibujando ahora
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {artistas.map((a) => {
          const contenido = (
            <>
              <span className="relative grid h-11 w-11 place-items-center rounded-full bg-ink-700 text-xs font-semibold uppercase ring-2 ring-emerald-400/70">
                {a.nombreArtista.slice(0, 2)}
                <span className="absolute -bottom-0.5 -right-0.5 text-[11px]" aria-hidden>
                  {a.lugar === 'FIESTA' ? '🎉' : '🖌️'}
                </span>
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-medium">{a.nombreArtista}</span>
                <span className="block truncate text-[11px] text-paper-dim">
                  {descripcionLugar(a)} · hace {formatDistanceToNowStrict(new Date(a.desde), { locale: es })}
                </span>
              </span>
            </>
          );
          return (
            <li key={a.usuarioId} className="shrink-0">
              {a.lugar === 'LIENZO' && a.comunidadId ? (
                <Link
                  to={`/comunidades/${a.comunidadId}/lienzo`}
                  title="Ir a dibujar con este artista"
                  className="flex max-w-[15rem] items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-800/60"
                >
                  {contenido}
                </Link>
              ) : (
                <Link to={`/perfil/${a.nombreArtista}`} className="flex max-w-[15rem] items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-800/60">
                  {contenido}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
