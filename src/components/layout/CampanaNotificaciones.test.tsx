import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { useNotificacionesStore } from '../../features/notifications/notificacionesStore';
import { CampanaNotificaciones } from './CampanaNotificaciones';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const aviso = {
  id: 'n1',
  tipo: 'NUEVO_LIKE',
  actorId: 'a1',
  actorNombre: 'Sam',
  referenciaId: 'p1',
  mensaje: 'A Sam le gustó tu obra',
  leida: false,
  creadoEn: '2026-11-10T10:00:00Z',
};

afterEach(() => {
  vi.restoreAllMocks();
  useNotificacionesStore.getState().reiniciar();
});

describe('CampanaNotificaciones', () => {
  it('al abrir un aviso lo marca como leído', async () => {
    useNotificacionesStore.setState({ noLeidas: 1 });
    vi.spyOn(api, 'get').mockResolvedValue({ data: [aviso] });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: null });
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    await act(async () =>
      createRoot(contenedor).render(
        <MemoryRouter>
          <CampanaNotificaciones />
        </MemoryRouter>,
      ),
    );

    await act(async () => contenedor.querySelector<HTMLElement>('button[aria-expanded]')?.click());
    const fila = [...contenedor.querySelectorAll('li button')][0] as HTMLElement;
    await act(async () => fila.click());

    expect(post).toHaveBeenCalledWith('/api/notificaciones/n1/leer');
    expect(useNotificacionesStore.getState().noLeidas).toBe(0);
    contenedor.remove();
  });
});
