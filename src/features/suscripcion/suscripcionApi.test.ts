import { describe, expect, it, vi } from 'vitest';
import { esperarPremium, leerResultadoPago } from './suscripcionApi';

vi.mock('../../lib/api', () => ({ api: { post: vi.fn() } }));

const sesion = (premium: boolean) => ({
  accessToken: 'jwt',
  usuarioId: 'u-1',
  nombreArtista: 'lucia',
  rolGlobal: 'USUARIO',
  premium,
});

describe('leerResultadoPago', () => {
  it.each([
    ['collection_status=approved', 'aprobado'],
    ['status=approved', 'aprobado'],
    ['collection_status=pending', 'pendiente'],
    ['status=in_process', 'pendiente'],
    ['collection_status=rejected', 'rechazado'],
    ['collection_status=null', 'rechazado'],
    ['', 'rechazado'],
  ])('%s → %s', (query, esperado) => {
    expect(leerResultadoPago(new URLSearchParams(query))).toBe(esperado);
  });
});

describe('esperarPremium', () => {
  it('reintenta hasta que el token refleja el plan', async () => {
    const refrescar = vi.fn()
      .mockResolvedValueOnce(sesion(false))
      .mockResolvedValueOnce(sesion(false))
      .mockResolvedValueOnce(sesion(true));

    const resultado = await esperarPremium(refrescar, 5, 0);

    expect(resultado?.premium).toBe(true);
    expect(refrescar).toHaveBeenCalledTimes(3);
  });

  it('se rinde tras agotar los intentos', async () => {
    const refrescar = vi.fn().mockResolvedValue(sesion(false));

    const resultado = await esperarPremium(refrescar, 3, 0);

    expect(resultado?.premium).toBe(false);
    expect(refrescar).toHaveBeenCalledTimes(3);
  });
});
