import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { INTERVALO_EN_VIVO_MS, cargarArtistasEnVivo, destinoArtista, textoActividad, type ArtistaEnVivo } from './enVivoApi';

export function DibujandoAhora() {
  const [artistas, setArtistas] = useState<ArtistaEnVivo[]>([]);

  useEffect(() => {
    let vigente = true;
    const actualizar = () => {
      if (document.hidden) return;
      cargarArtistasEnVivo()
        .then((lista) => vigente && setArtistas(lista))
        .catch(() => undefined);
    };
    actualizar();
    const intervalo = setInterval(actualizar, INTERVALO_EN_VIVO_MS);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      vigente = false;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, []);

  if (artistas.length === 0) return null;

  return (
    <section aria-label="Artistas dibujando ahora" className="card mb-6 p-4">
      <p className="label mb-3">Dibujando ahora</p>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {artistas.map((a) => (
          <Link key={a.usuarioId} to={destinoArtista(a)} className="group flex w-20 flex-shrink-0 flex-col items-center text-center">
            <span className="relative">
              {a.fotoUrl ? (
                <img src={a.fotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-700 text-xs font-semibold uppercase">
                  {a.nombreArtista.slice(0, 2)}
                </span>
              )}
              <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
            </span>
            <span className="mt-1.5 w-full truncate text-xs font-medium text-paper group-hover:text-coral">{a.nombreArtista}</span>
            <span className="w-full truncate text-[10px] text-paper-dim">{textoActividad(a)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
