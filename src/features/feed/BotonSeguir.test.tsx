import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { BotonSeguir } from './BotonSeguir';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

async function pulsar(loSigo: boolean, respuesta: boolean) {
  const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { loSigo: respuesta, seguidores: 1 } });
  const onCambio = vi.fn();
  const contenedor = document.createElement('div');
  await act(async () => createRoot(contenedor).render(<BotonSeguir usuarioId="a1" loSigo={loSigo} onCambio={onCambio} />));
  await act(async () => contenedor.querySelector('button')?.click());
  return { post, onCambio };
}

describe('BotonSeguir', () => {
  it('sigue con POST y avisa el estado que devuelve el servidor', async () => {
    const { post, onCambio } = await pulsar(false, true);

    expect(post).toHaveBeenCalledWith('/api/artistas/a1/seguir');
    expect(onCambio).toHaveBeenCalledWith(true);
  });

  it('deja de seguir con la misma ruta, que alterna el estado', async () => {
    const { post, onCambio } = await pulsar(true, false);

    expect(post).toHaveBeenCalledWith('/api/artistas/a1/seguir');
    expect(onCambio).toHaveBeenCalledWith(false);
  });
});
