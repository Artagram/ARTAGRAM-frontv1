import { fetchEventSource } from '@microsoft/fetch-event-source';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_BASE_URL, api } from '../../lib/api';

export const TIPO_MENSAJE = 'MENSAJE_DIRECTO';
export const TIPOS_SUSCRIPCION = ['SUSCRIPCION_PREMIUM', 'SUSCRIPCION_VENCIDA'];

const TIPOS_DE_OBRA = ['NUEVO_LIKE', 'NUEVO_COMENTARIO', 'ANALISIS_IA_LISTO', 'OBRA_MODERADA'];
const ESPERA_RECONEXION_MS = 5000;

export interface Notificacion {
  id: string;
  tipo: string;
  actorId: string | null;
  actorNombre: string;
  referenciaId: string | null;
  mensaje: string;
  leida: boolean;
  creadoEn: string;
}

export interface NoLeidas {
  notificaciones: number;
  mensajes: number;
}

export interface GrupoDia {
  dia: string;
  notificaciones: Notificacion[];
}

export async function cargarNotificaciones(): Promise<Notificacion[]> {
  const { data } = await api.get<Notificacion[]>('/api/notificaciones');
  return data;
}

export async function cargarNoLeidas(): Promise<NoLeidas> {
  const { data } = await api.get<NoLeidas>('/api/notificaciones/no-leidas/cantidad');
  return data;
}

export async function marcarLeida(id: string): Promise<void> {
  await api.post(`/api/notificaciones/${id}/leer`);
}

export async function marcarTodasLeidas(): Promise<void> {
  await api.post('/api/notificaciones/leer-todas');
}

export async function marcarMensajesLeidos(): Promise<void> {
  await api.post('/api/notificaciones/leer-todas', null, { params: { mensajes: true } });
}

class SesionRechazada extends Error {}

interface OpcionesConexion {
  token: string;
  signal: AbortSignal;
  onAbierta: () => void;
  onNotificacion: (n: Notificacion) => void;
}

/** EventSource no puede enviar Authorization; fetchEventSource sí. */
export function conectarNotificaciones({ token, signal, onAbierta, onNotificacion }: OpcionesConexion): Promise<void> {
  return fetchEventSource(`${API_BASE_URL}/api/notificaciones/stream`, {
    signal,
    headers: { Authorization: `Bearer ${token}` },
    async onopen(respuesta) {
      if (respuesta.status === 401 || respuesta.status === 403) throw new SesionRechazada();
      if (!respuesta.ok) throw new Error(`Stream de notificaciones: ${respuesta.status}`);
      onAbierta();
    },
    onmessage(evento) {
      if (evento.event === 'notificacion') onNotificacion(JSON.parse(evento.data) as Notificacion);
    },
    // Sin este throw la librería da la conexión por terminada y no reintenta.
    onclose() {
      throw new Error('Stream de notificaciones cerrado');
    },
    onerror(error) {
      if (error instanceof SesionRechazada) throw error;
      return ESPERA_RECONEXION_MS;
    },
  });
}

export function destinoNotificacion(n: Notificacion, nombrePropio: string): string | null {
  if (n.tipo === 'NUEVO_SEGUIDOR') return `/perfil/${encodeURIComponent(n.actorNombre)}`;
  if (TIPOS_SUSCRIPCION.includes(n.tipo)) return `/perfil/${encodeURIComponent(nombrePropio)}`;
  if (TIPOS_DE_OBRA.includes(n.tipo) && n.referenciaId) return `/obra/${n.referenciaId}`;
  return null;
}

function nombreDia(fecha: Date): string {
  if (isToday(fecha)) return 'Hoy';
  if (isYesterday(fecha)) return 'Ayer';
  return format(fecha, "d 'de' MMMM", { locale: es });
}

/** La lista llega de más reciente a más antigua, y así quedan los grupos. */
export function agruparPorDia(lista: Notificacion[]): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const n of lista) {
    const dia = nombreDia(new Date(n.creadoEn));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.notificaciones.push(n);
    else grupos.push({ dia, notificaciones: [n] });
  }
  return grupos;
}

export function contadorVisible(cantidad: number): string {
  return cantidad > 9 ? '9+' : String(cantidad);
}
