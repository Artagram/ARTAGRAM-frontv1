import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { PanelLateral } from '../../components/ui/PanelLateral';
import { Skeleton } from '../../components/ui/Skeleton';
import { PostCard } from './PostCard';
import { PublishWizard } from './PublishWizard';
import { BuscarArtistas } from './BuscarArtistas';
import { DibujandoAhora } from './DibujandoAhora';
import { ArtistasRecomendados } from './ArtistasRecomendados';
import { cargarArtistasRecomendados, type ArtistaRecomendado } from './recomendacionesApi';
import type { FeedResponse, PublicacionDto } from '../../types';

type PestanaFeed = 'siguiendo' | 'explorar';

const PESTANAS: { id: PestanaFeed; texto: string }[] = [
  { id: 'siguiendo', texto: 'Siguiendo' },
  { id: 'explorar', texto: 'Explorar' },
];

export function FeedPage() {
  const [pestana, setPestana] = useState<PestanaFeed>('siguiendo');
  const [publicaciones, setPublicaciones] = useState<PublicacionDto[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarPublicar, setMostrarPublicar] = useState(false);
  const [recomendados, setRecomendados] = useState<ArtistaRecomendado[]>([]);

  // Si se cambia de pestaña antes de que responda la anterior, esa respuesta se ignora.
  const ultimaCarga = useRef(0);

  async function cargar(dePestana: PestanaFeed, desdeInicio: boolean) {
    const carga = ++ultimaCarga.current;
    try {
      const siguiente = desdeInicio ? 0 : pagina + 1;
      const { data } = await api.get<FeedResponse>(`/api/feed/${dePestana}`, { params: { pagina: siguiente } });
      if (carga !== ultimaCarga.current) return;
      setPublicaciones((prev) => (desdeInicio ? data.publicaciones : [...prev, ...data.publicaciones]));
      setHayMas(data.hayMas);
      setPagina(siguiente);
    } catch (err) {
      if (carga === ultimaCarga.current) setError(extraerMensajeError(err));
    } finally {
      if (carga === ultimaCarga.current) setCargando(false);
    }
  }

  useEffect(() => {
    setCargando(true);
    setPublicaciones([]);
    setHayMas(false);
    setError(null);
    void cargar(pestana, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana]);

  useEffect(() => {
    cargarArtistasRecomendados().then(setRecomendados).catch(() => undefined);
  }, []);

  async function cargarMas() {
    setCargandoMas(true);
    await cargar(pestana, false);
    setCargandoMas(false);
  }

  const alCambiarSeguimiento = () => void cargar(pestana, true);

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="mb-5">
          <h1 className="font-display text-[32px] font-semibold leading-tight">Feed</h1>
          <p className="text-sm text-paper-muted">Obras y su proceso, de la gente que sigues y de la comunidad.</p>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="tabs" role="tablist" aria-label="Feed">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pestana === p.id}
                onClick={() => setPestana(p.id)}
                className={clsx('tab', pestana === p.id && 'tab-activa')}
              >
                {p.texto}
              </button>
            ))}
          </div>
          <Button className="hidden sm:inline-flex" onClick={() => setMostrarPublicar(true)}>
            + Publicar
          </Button>
        </div>

        <DibujandoAhora />
      </div>

      {/* Va entre los dos bloques del contenido para que en celular quede antes de las obras. */}
      <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="flex flex-col gap-4 lg:sticky lg:top-[var(--alto-barra)]">
          {/* Buscar personas y seguirlas: el feed muestra tus obras y las de quienes sigues */}
          <BuscarArtistas mostrarSugerencias={!cargando && publicaciones.length === 0} onSeguimientoCambiado={alCambiarSeguimiento} />
          {recomendados.length > 0 && <ArtistasRecomendados artistas={recomendados} onSeguimientoCambiado={alCambiarSeguimiento} />}
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        {error && <p className="banner-error mb-4">{error}</p>}

        {cargando ? (
          <Skeleton filas={2} className="mx-auto max-w-2xl" claseFila="h-96" />
        ) : publicaciones.length === 0 ? (
          <div className="card card-fija flex flex-col items-center gap-3 p-12 text-center">
            <div className="text-4xl">🖌️</div>
            {pestana === 'siguiendo' ? (
              <>
                <h3 className="font-display text-xl font-semibold">
                  Todavía no hay nada <span className="acento">aquí</span>
                </h3>
                <p className="max-w-sm text-sm text-paper-muted">Publica tu primera obra o sigue artistas para ver lo que hacen.</p>
                <Button variant="secondary" onClick={() => setPestana('explorar')}>
                  Ir a Explorar
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-display text-xl font-semibold">
                  Todavía no hay obras para <span className="acento">explorar</span>
                </h3>
                <p className="max-w-sm text-sm text-paper-muted">Publica la primera y aparecerá aquí.</p>
              </>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {publicaciones.map((p) => (
              <PostCard
                key={p.id}
                publicacion={p}
                onEliminada={(id) => setPublicaciones((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}

        {hayMas && (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={cargarMas} cargando={cargandoMas}>
              Cargar más
            </Button>
          </div>
        )}
      </div>

      {!mostrarPublicar && (
        <button
          type="button"
          aria-label="Publicar"
          onClick={() => setMostrarPublicar(true)}
          className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-coral text-2xl text-ink-800 shadow-glow-coral sm:hidden"
        >
          +
        </button>
      )}

      {mostrarPublicar && (
        <PanelLateral etiqueta="Publicar obra" onCerrar={() => setMostrarPublicar(false)}>
          <PublishWizard
            onCerrar={() => setMostrarPublicar(false)}
            onPublicado={(p) => {
              setPublicaciones((prev) => [p, ...prev]);
              setMostrarPublicar(false);
            }}
          />
        </PanelLateral>
      )}
    </div>
  );
}
