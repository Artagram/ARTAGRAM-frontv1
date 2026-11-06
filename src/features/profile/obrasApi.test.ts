import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import type { PublicacionDto } from '../../types';
import { actualizarDestacadas, alternarDestacada, reemplazarObra } from './obrasApi';

const obra = (id: string, destacada: boolean) => ({ id, destacada }) as PublicacionDto;

afterEach(() => vi.restoreAllMocks());

describe('alternarDestacada', () => {
  it('destaca con PUT una obra sin destacar', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: obra('a', true) });

    expect((await alternarDestacada(obra('a', false))).destacada).toBe(true);
    expect(put).toHaveBeenCalledWith('/api/publicaciones/a/destacar');
  });

  it('quita con DELETE una obra destacada', async () => {
    const borrar = vi.spyOn(api, 'delete').mockResolvedValue({ data: obra('a', false) });

    expect((await alternarDestacada(obra('a', true))).destacada).toBe(false);
    expect(borrar).toHaveBeenCalledWith('/api/publicaciones/a/destacar');
  });
});

describe('listas del perfil', () => {
  it('pone primero la obra recién destacada', () => {
    expect(actualizarDestacadas([obra('b', true)], obra('a', true)).map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('saca la obra que dejó de estar destacada', () => {
    expect(actualizarDestacadas([obra('a', true), obra('b', true)], obra('a', false)).map((o) => o.id)).toEqual(['b']);
  });

  it('reemplaza solo la obra modificada', () => {
    expect(reemplazarObra([obra('a', false), obra('b', false)], obra('b', true))[1].destacada).toBe(true);
  });
});
