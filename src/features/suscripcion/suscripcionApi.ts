import { api } from '../../lib/api';
import type { SesionUsuario } from '../../lib/authStore';

interface CheckoutResponse {
  checkoutUrl: string;
  idTransaccion: string;
  proveedor: string;
}

export interface Suscripcion {
  plan: string;
  estado: string;
  fechaFin: string | null;
  premium: boolean;
  megabytesUsados: number;
  maxMegabytes: number;
  obrasSubidas: number;
  maxObras: number;
}

export type ResultadoPago = 'aprobado' | 'pendiente' | 'rechazado';

export const PREFIJO_SIMULADO = 'sim_';

export async function crearCheckout(retornoUrl: string): Promise<string> {
  const { data } = await api.post<CheckoutResponse>('/api/suscripcion/checkout', { plan: 'PRO', retornoUrl });
  return data.checkoutUrl;
}

export async function cargarSuscripcion(): Promise<Suscripcion> {
  const { data } = await api.get<Suscripcion>('/api/suscripcion/actual');
  return data;
}

export async function refrescarSesion(): Promise<SesionUsuario> {
  const { data } = await api.post<SesionUsuario>('/api/auth/token/refrescar');
  return data;
}

/** Solo en desarrollo: con el proveedor simulado no hay webhook que active el plan. */
export async function confirmarPagoSimulado(tx: string): Promise<void> {
  await api.post('/api/suscripcion/confirmar', null, { params: { tx } });
}

/** Mercado Pago devuelve el estado en `status` o `collection_status`. */
export function leerResultadoPago(params: URLSearchParams): ResultadoPago {
  const estado = params.get('collection_status') ?? params.get('status');
  if (estado === 'approved') return 'aprobado';
  if (estado === 'pending' || estado === 'in_process') return 'pendiente';
  return 'rechazado';
}

/**
 * El navegador suele volver antes de que llegue el webhook, así que se pide el
 * token de nuevo hasta que refleje el plan. Devuelve la última sesión obtenida.
 */
export async function esperarPremium(
  refrescar: () => Promise<SesionUsuario>,
  intentos = 10,
  esperaMs = 2000,
): Promise<SesionUsuario | null> {
  let sesion: SesionUsuario | null = null;
  for (let i = 0; i < intentos; i++) {
    sesion = await refrescar();
    if (sesion.premium) {
      return sesion;
    }
    if (i < intentos - 1) {
      await new Promise((resolver) => setTimeout(resolver, esperaMs));
    }
  }
  return sesion;
}
