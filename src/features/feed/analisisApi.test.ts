import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { esperarAnalisis } from './analisisApi';

afterEach(() => vi.restoreAllMocks());

describe('esperarAnalisis', () => {
  it('consulta hasta que el análisis termina', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { estado: 'PENDIENTE' } })
      .mockResolvedValueOnce({ data: { estado: 'COMPLETADO', scoreEstimado: 90 } });

    const resultado = await esperarAnalisis('p1', 0);

    expect(resultado.scoreEstimado).toBe(90);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('se rinde si nunca termina', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { estado: 'PENDIENTE' } });

    await expect(esperarAnalisis('p1', 0)).rejects.toThrow('tardando');
  });
});
