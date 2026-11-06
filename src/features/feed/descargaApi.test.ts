import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { descargarObra } from './descargaApi';

afterEach(() => vi.restoreAllMocks());

describe('descargarObra', () => {
  it('abre la URL que entrega el servidor', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { url: 'https://s3/firmada' } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe('https://s3/firmada');
    });

    await descargarObra('p1');

    expect(get).toHaveBeenCalledWith('/api/publicaciones/p1/descargar');
    expect(click).toHaveBeenCalledOnce();
  });
});
