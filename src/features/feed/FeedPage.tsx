import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
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

  return (
    <div className="mx-auto flex max-w-6xl justify-center gap-6 px-4 py-8">
    <div className="w-full min-w-0 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Feed</h1>
          <p className="text-sm text-paper-muted">Obras y su proceso, de la gente que sigues y de la comunidad.</p>
        </div>
        {!mostrarPublicar && <Button onClick={() => setMostrarPublicar(true)}>Publicar</Button>}
      </div>

      <DibujandoAhora />

      {/* Buscar personas y seguirlas: el feed muestra tus obras y las de quienes sigues */}
      <BuscarArtistas
        mostrarSugerencias={!cargando && publicaciones.length === 0}
        onSeguimientoCambiado={() => void cargar(pestana, true)}
      />

      {recomendados.length > 0 && (
        <div className="lg:hidden">
          <ArtistasRecomendados artistas={recomendados} onSeguimientoCambiado={() => void cargar(pestana, true)} />
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-xl border border-ink-700 bg-ink-900/40 p-1" role="tablist" aria-label="Feed">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              pestana === p.id ? 'bg-ink-800 text-paper' : 'text-paper-muted hover:text-paper'
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {mostrarPublicar && (
          <PublishWizard
            onCerrar={() => setMostrarPublicar(false)}
            onPublicado={(p) => {
              setPublicaciones((prev) => [p, ...prev]);
              setMostrarPublicar(false);
            }}
          />
        )}
      </AnimatePresence>

      {error && <p className="mb-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}

      {cargando ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      ) : publicaciones.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="text-4xl">🖌️</div>
          {pestana === 'siguiendo' ? (
            <>
              <h3 className="font-display text-lg font-semibold">Todavía no hay nada aquí</h3>
              <p className="max-w-sm text-sm text-paper-muted">Publica tu primera obra o sigue artistas para ver lo que hacen.</p>
              <Button variant="secondary" onClick={() => setPestana('explorar')}>
                Ir a Explorar
              </Button>
            </>
          ) : (
            <>
              <h3 className="font-display text-lg font-semibold">Todavía no hay obras para explorar</h3>
              <p className="max-w-sm text-sm text-paper-muted">Publica la primera y aparecerá aquí.</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
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
    {recomendados.length > 0 && (
      <aside className="hidden w-72 flex-shrink-0 lg:block">
        <div className="sticky top-20">
          <ArtistasRecomendados artistas={recomendados} onSeguimientoCambiado={() => void cargar(pestana, true)} />
        </div>
      </aside>
    )}
    </div>
  );
}
