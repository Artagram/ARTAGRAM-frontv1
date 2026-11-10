import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { FeedPage } from './FeedPage';

vi.mock('./DibujandoAhora', () => ({ DibujandoAhora: () => null }));
vi.mock('./BuscarArtistas', () => ({ BuscarArtistas: () => null }));
vi.mock('./ArtistasRecomendados', () => ({ ArtistasRecomendados: () => null }));
vi.mock('./recomendacionesApi', () => ({ cargarArtistasRecomendados: () => Promise.resolve([]) }));
vi.mock('./PostCard', () => ({ PostCard: () => null }));
vi.mock('./PublishWizard', () => ({ PublishWizard: () => null }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

describe('FeedPage', () => {
  it('pide la ruta de cada pestaña desde la primera página', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { publicaciones: [], hayMas: false } });
    const contenedor = document.createElement('div');
    await act(async () => createRoot(contenedor).render(<FeedPage />));

    expect(get).toHaveBeenLastCalledWith('/api/feed/siguiendo', { params: { pagina: 0 } });

    const explorar = [...contenedor.querySelectorAll('[role="tab"]')].find((b) => b.textContent === 'Explorar');
    await act(async () => (explorar as HTMLElement).click());

    expect(get).toHaveBeenLastCalledWith('/api/feed/explorar', { params: { pagina: 0 } });
  });
});
