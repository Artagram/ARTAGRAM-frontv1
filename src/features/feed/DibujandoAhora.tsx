import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { INTERVALO_EN_VIVO_MS, cargarArtistasEnVivo, destinoArtista, textoActividad, type ArtistaEnVivo } from './enVivoApi';

const MINIMO_CARRUSEL = 6;

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

  // Con pocos artistas la pista no llena el ancho y el bucle dejaría huecos.
  const enCarrusel = artistas.length >= MINIMO_CARRUSEL;

  return (
    <section aria-label="Artistas dibujando ahora" className="card card-fija mb-5 p-3.5">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium text-paper-muted">
        <span className="punto-vivo" aria-hidden />
        Dibujando ahora
      </p>
      <div className={enCarrusel ? 'carrusel' : 'overflow-x-auto'}>
        <div className={enCarrusel ? 'carrusel-pista' : 'flex'}>
          {artistas.map((a) => (
            <TarjetaArtista key={a.usuarioId} artista={a} />
          ))}
          {enCarrusel && artistas.map((a) => <TarjetaArtista key={`copia-${a.usuarioId}`} artista={a} copia />)}
        </div>
      </div>
    </section>
  );
}

function TarjetaArtista({ artista: a, copia }: { artista: ArtistaEnVivo; copia?: boolean }) {
  return (
    <Link
      to={destinoArtista(a)}
      aria-hidden={copia}
      tabIndex={copia ? -1 : undefined}
      className="group flex w-20 flex-shrink-0 flex-col items-center pr-2 text-center"
    >
      <span className="aro-vivo">
        {a.fotoUrl ? (
          <img src={a.fotoUrl} alt="" className="h-12 w-12 rounded-full border-2 border-ink-800 object-cover" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-ink-800 bg-ink-600 text-xs font-semibold uppercase">
            {a.nombreArtista.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="mt-1.5 w-full truncate text-xs font-medium text-paper group-hover:text-coral">{a.nombreArtista}</span>
      <span className="w-full truncate text-[10px] text-paper-dim">{textoActividad(a)}</span>
    </Link>
  );
}
