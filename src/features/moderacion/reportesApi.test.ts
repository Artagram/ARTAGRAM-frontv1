import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { procesarObrasSinMarca, reportarObra, resolverReporte, resumirMotivos } from './reportesApi';

vi.mock('../../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

describe('reportesApi', () => {
  beforeEach(() => vi.mocked(api.post).mockReset());

  it('envia el reporte sin detalle cuando queda en blanco', async () => {
    vi.mocked(api.post).mockResolvedValue({});

    await reportarObra('o1', 'SPAM', '   ');

    expect(api.post).toHaveBeenCalledWith('/api/publicaciones/o1/reportar', { motivo: 'SPAM', detalle: null });
  });

  it('resuelve un reporte con la accion elegida', async () => {
    vi.mocked(api.post).mockResolvedValue({});

    await resolverReporte('o1', 'RESTAURAR');

    expect(api.post).toHaveBeenCalledWith('/api/moderacion/publicaciones/o1/resolver', { accion: 'RESTAURAR' });
  });

  it('devuelve cuantas obras se enviaron a marcar', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { enviadas: 4 } });

    await expect(procesarObrasSinMarca()).resolves.toBe(4);
  });

  it('resume los motivos empezando por el mas repetido', () => {
    expect(resumirMotivos({ PLAGIO: 1, SPAM: 2 })).toBe('Spam (2) · Plagio (1)');
  });
});
