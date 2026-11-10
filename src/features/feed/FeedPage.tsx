import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { FondoEstudio } from '../../components/layout/FondoEstudio';
import { PostCard } from './PostCard';
import { PublishWizard } from './PublishWizard';
import { BuscarArtistas } from './BuscarArtistas';
import { DibujandoAhora } from './DibujandoAhora';
import { ArtistasRecomendados } from './ArtistasRecomendados';
import { cargarArtistasRecomendados, type ArtistaRecomendado } from './recomendacionesApi';
import type { FeedResponse, PublicacionDto } from '../../types';

export function FeedPage() {
  const [publicaciones, setPublicaciones] = useState<PublicacionDto[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarPublicar, setMostrarPublicar] = useState(false);
  const [recomendados, setRecomendados] = useState<ArtistaRecomendado[]>([]);

  async function cargar(desdeInicio: boolean) {
    try {
      const siguiente = desdeInicio ? 0 : pagina + 1;
      const { data } = await api.get<FeedResponse>('/api/feed', { params: { pagina: siguiente } });
      setPublicaciones((prev) => (desdeInicio ? data.publicaciones : [...prev, ...data.publicaciones]));
      setHayMas(data.hayMas);
      setPagina(siguiente);
    } catch (err) {
      setError(extraerMensajeError(err));
    }
  }

  useEffect(() => {
    cargar(true).finally(() => setCargando(false));
    cargarArtistasRecomendados().then(setRecomendados).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarMas() {
    setCargandoMas(true);
    await cargar(false);
    setCargandoMas(false);
  }

  return (
    <FondoEstudio>
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
        onSeguimientoCambiado={() => void cargar(true)}
      />

      {recomendados.length > 0 && (
        <div className="lg:hidden">
          <ArtistasRecomendados artistas={recomendados} onSeguimientoCambiado={() => void cargar(true)} />
        </div>
      )}

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
          <h3 className="font-display text-lg font-semibold">Todavía no hay nada en tu feed</h3>
          <p className="max-w-sm text-sm text-paper-muted">Publica tu primera obra o busca artistas arriba y síguelos para ver lo que hacen.</p>
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
          <ArtistasRecomendados artistas={recomendados} onSeguimientoCambiado={() => void cargar(true)} />
        </div>
      </aside>
    )}
    </div>
    </FondoEstudio>
  );
}
