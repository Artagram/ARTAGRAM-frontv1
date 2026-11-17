import { describe, expect, it, vi } from 'vitest';
import { esperarPremium, leerResultadoPago, validarUrlCheckout } from './suscripcionApi';

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

describe('validarUrlCheckout', () => {
  it('permite URLs relativas al mismo origen', () => {
    expect(validarUrlCheckout('/suscripcion/resultado?collection_status=approved')).toContain('/suscripcion/resultado');
  });

  it('permite checkout oficial de Mercado Pago en HTTPS', () => {
    const url = 'https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=123';
    expect(validarUrlCheckout(url)).toBe(url);
  });

  it('permite checkout de Mercado Pago global y regional', () => {
    expect(validarUrlCheckout('https://mercadopago.com/checkout')).toBe('https://mercadopago.com/checkout');
    expect(validarUrlCheckout('https://www.mercadopago.com.ar/checkout')).toBe('https://www.mercadopago.com.ar/checkout');
    expect(validarUrlCheckout('https://www.mercadopago.cl/checkout')).toBe('https://www.mercadopago.cl/checkout');
  });

  it('rechaza dominios externos no autorizados', () => {
    expect(() => validarUrlCheckout('https://sitio-malicioso.com')).toThrow('URL de pago no permitida');
    expect(() => validarUrlCheckout('https://evil-mercadopago.com')).toThrow('URL de pago no permitida');
    expect(() => validarUrlCheckout('https://mercadopago.com.co.evil.com')).toThrow('URL de pago no permitida');
  });

  it('rechaza protocolos no seguros o peligrosos', () => {
    expect(() => validarUrlCheckout('http://www.mercadopago.com.co/checkout')).toThrow('URL de pago no permitida');
    expect(() => validarUrlCheckout('javascript:alert(1)')).toThrow('URL de pago no permitida');
  });
});
