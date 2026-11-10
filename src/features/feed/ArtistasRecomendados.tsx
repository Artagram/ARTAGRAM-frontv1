import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BotonSeguir } from './BotonSeguir';
import { motivoRecomendacion, type ArtistaRecomendado } from './recomendacionesApi';

interface Props {
  artistas: ArtistaRecomendado[];
  onSeguimientoCambiado: () => void;
}

export function ArtistasRecomendados({ artistas, onSeguimientoCambiado }: Props) {
  const [seguidos, setSeguidos] = useState<ReadonlySet<string>>(new Set());

  function alCambiar(usuarioId: string, loSigo: boolean) {
    setSeguidos((prev) => {
      const siguiente = new Set(prev);
      if (loSigo) siguiente.add(usuarioId);
      else siguiente.delete(usuarioId);
      return siguiente;
    });
    onSeguimientoCambiado();
  }

  return (
    <section aria-label="Artistas que te pueden gustar" className="card mb-6 p-4 lg:mb-0">
      <p className="label mb-3">Artistas que te pueden gustar</p>
      <ul className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {artistas.map((a) => (
          <li key={a.usuarioId} className="flex w-44 flex-shrink-0 flex-col gap-2 lg:w-auto">
            <Link to={`/perfil/${encodeURIComponent(a.nombreArtista)}`} className="flex min-w-0 items-center gap-2 hover:text-coral">
              {a.fotoUrl ? (
                <img src={a.fotoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-700 text-xs font-semibold uppercase">
                  {a.nombreArtista.slice(0, 2)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{a.nombreArtista}</span>
                <span className="block truncate text-[11px] text-paper-dim">{motivoRecomendacion(a)}</span>
              </span>
            </Link>
            <BotonSeguir
              usuarioId={a.usuarioId}
              loSigo={seguidos.has(a.usuarioId)}
              onCambio={(loSigo) => alCambiar(a.usuarioId, loSigo)}
              className="w-full px-3 py-1 text-xs"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
