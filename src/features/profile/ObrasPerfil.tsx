import { useEffect, useState } from 'react';
import { extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import type { PublicacionDto } from '../../types';
import { actualizarDestacadas, alternarDestacada, cargarDestacadas, cargarObras, reemplazarObra } from './obrasApi';

function ObraTile({ obra, editable, onAlternar }: { obra: PublicacionDto; editable: boolean; onAlternar: (o: PublicacionDto) => void }) {
  const accion = obra.destacada ? 'Quitar de destacadas' : 'Destacar obra';
  return (
    <div className="relative overflow-hidden rounded-xl">
      <img src={obra.obraFinalUrl} alt={obra.titulo} className="aspect-square w-full object-cover" />
      <p className="mt-1 truncate text-xs text-paper-muted">{obra.titulo}</p>
      {obra.oculta && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-ink-950/80 px-2 py-0.5 text-[10px] text-coral-light">
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
          className={`absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink-950/70 text-sm ${
            obra.destacada ? 'text-amber-300' : 'text-paper-muted hover:text-amber-300'
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
      {error && <p className="mt-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}
      {destacadas.length > 0 && (
        <div className="mt-6">
          <p className="label mb-2">Obras destacadas</p>
          <div className="grid grid-cols-3 gap-3">
            {destacadas.map((o) => (
              <ObraTile key={o.id} obra={o} editable={esPropio} onAlternar={alternar} />
            ))}
          </div>
        </div>
      )}
      {obras.length > 0 && (
        <div className="mt-6">
          <p className="label mb-2">Obras</p>
          <div className="grid grid-cols-3 gap-3">
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
