import { useEffect, useState } from 'react';
import { extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import type { PublicacionDto } from '../../types';
import { actualizarDestacadas, alternarDestacada, cargarDestacadas, cargarObras, reemplazarObra } from './obrasApi';

function ObraTile({ obra, editable, onAlternar, grande }: { obra: PublicacionDto; editable: boolean; onAlternar: (o: PublicacionDto) => void; grande?: boolean }) {
  const accion = obra.destacada ? 'Quitar de destacadas' : 'Destacar obra';
  return (
    <div className="relative">
      <img src={obra.obraFinalUrl} alt={obra.titulo} className={`aspect-square w-full object-cover ${grande ? 'rounded-2xl' : 'rounded-lg'}`} />
      <p className={grande ? 'mt-1.5 truncate font-display text-base font-semibold' : 'mt-1 truncate text-xs text-paper-muted'}>{obra.titulo}</p>
      {obra.oculta && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-ink-800/85 px-2 py-0.5 text-[10px] text-coral-light">
          En revisión
        </span>
      )}
      {editable && (
        <button
          type="button"
          onClick={() => onAlternar(obra)}
          title={accion}
          aria-label={accion}
          aria-pressed={obra.destacada}
          className={`absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-full bg-ink-800/80 text-sm sm:h-7 sm:w-7 ${
            obra.destacada ? 'text-amber' : 'text-paper-muted hover:text-amber'
          }`}
        >
          {obra.destacada ? '★' : '☆'}
        </button>
      )}
    </div>
  );
}

export function ObrasPerfil({ autorId, esPropio }: { autorId: string; esPropio: boolean }) {
  const [destacadas, setDestacadas] = useState<PublicacionDto[]>([]);
  const [obras, setObras] = useState<PublicacionDto[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([cargarDestacadas(autorId), cargarObras(autorId, 0)])
      .then(([listaDestacadas, primera]) => {
        if (!vigente) return;
        setDestacadas(listaDestacadas);
        setObras(primera.content);
        setHayMas(!primera.last);
      })
      .catch((err) => vigente && setError(extraerMensajeError(err, 'No pudimos cargar las obras')));
    return () => {
      vigente = false;
    };
  }, [autorId]);

  async function verMas() {
    setCargandoMas(true);
    try {
      const siguiente = await cargarObras(autorId, pagina + 1);
      setObras((prev) => [...prev, ...siguiente.content]);
      setPagina(pagina + 1);
      setHayMas(!siguiente.last);
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos cargar más obras'));
    } finally {
      setCargandoMas(false);
    }
  }

  async function alternar(obra: PublicacionDto) {
    setError(null);
    try {
      const actualizada = await alternarDestacada(obra);
      setObras((prev) => reemplazarObra(prev, actualizada));
      setDestacadas((prev) => actualizarDestacadas(prev, actualizada));
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos actualizar la obra'));
    }
  }

  return (
    <>
      {error && <p className="banner-error mt-4">{error}</p>}
      {destacadas.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-xl font-semibold">
            Obras <span className="acento">destacadas</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {destacadas.map((o) => (
              <ObraTile key={o.id} obra={o} editable={esPropio} onAlternar={alternar} grande />
            ))}
          </div>
        </div>
      )}
      {obras.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-xl font-semibold">Obras</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {obras.map((o) => (
              <ObraTile key={o.id} obra={o} editable={esPropio} onAlternar={alternar} />
            ))}
          </div>
          {hayMas && (
            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={verMas} cargando={cargandoMas}>
                Ver más
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
