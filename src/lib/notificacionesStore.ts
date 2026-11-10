import { create } from 'zustand';
import { API_BASE_URL, api } from './api';
import { SseParser } from './sseParser';
import type { NotificacionDto } from '../types';

const MAXIMO_EN_MEMORIA = 50;
const ESPERA_INICIAL_MS = 2000;
const ESPERA_MAXIMA_MS = 30000;

interface NotificacionesState {
  notificaciones: NotificacionDto[];
  /** true mientras el stream en vivo esta abierto. */
  conectado: boolean;
  iniciar: (token: string) => void;
  detener: () => void;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  /** Al abrir /mensajes: los avisos de mensaje directo ya no estan pendientes. */
  marcarMensajesLeidos: () => void;
}

// Una sola conexion por sesion, como stompService: se reinicia si cambia el token
let controlador: AbortController | null = null;
let tokenActual: string | null = null;

/**
 * artagram-notifications serializa con String.valueOf, asi que un id ausente
 * puede llegar como el texto "null": se normaliza para no armar enlaces rotos.
 */
function normalizar(n: NotificacionDto): NotificacionDto {
  const limpio = (v: string | null) => (v && v !== 'null' ? v : null);
  return { ...n, actorId: limpio(n.actorId), actorNombre: limpio(n.actorNombre), referenciaId: limpio(n.referenciaId) };
}

/** Une dos listas sin duplicar por id, de la mas reciente a la mas vieja. */
function combinar(a: NotificacionDto[], b: NotificacionDto[]): NotificacionDto[] {
  const porId = new Map<string, NotificacionDto>();
  for (const n of [...a, ...b]) porId.set(n.id, { ...porId.get(n.id), ...n });
  return [...porId.values()]
    .sort((x, y) => new Date(y.creadoEn).getTime() - new Date(x.creadoEn).getTime())
    .slice(0, MAXIMO_EN_MEMORIA);
}

function esperar(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

export const useNotificacionesStore = create<NotificacionesState>((set, get) => {
  function marcarEnServidor(ids: string[]) {
    // No hay endpoint para varias a la vez: una peticion por notificacion
    ids.forEach((id) => void api.post(`/api/notificaciones/${id}/leer`).catch(() => {}));
  }

  function marcarLocal(debeMarcarse: (n: NotificacionDto) => boolean) {
    const ids = get()
      .notificaciones.filter((n) => !n.leida && debeMarcarse(n))
      .map((n) => n.id);
    if (!ids.length) return;
    set((s) => ({ notificaciones: s.notificaciones.map((n) => (ids.includes(n.id) ? { ...n, leida: true } : n)) }));
    marcarEnServidor(ids);
  }

  async function cargarLista(signal: AbortSignal) {
    try {
      const { data } = await api.get<NotificacionDto[]>('/api/notificaciones', { signal });
      set((s) => ({ notificaciones: combinar(data.map(normalizar), s.notificaciones) }));
    } catch {
      // sin lista inicial se sigue con lo que llegue en vivo
    }
  }

  /**
   * Mantiene abierto el stream y lo reabre con espera creciente si se cae (el
   * backend lo cierra solo a los 30 min). En cada reconexion se recarga la
   * lista para recuperar lo que llego mientras estaba caido.
   */
  async function escuchar(token: string, signal: AbortSignal) {
    let espera = ESPERA_INICIAL_MS;
    while (!signal.aborted) {
      try {
        const respuesta = await fetch(`${API_BASE_URL}/api/notificaciones/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal,
        });
        if (respuesta.status === 401 || respuesta.status === 403) {
          // Token vencido: el resto de la app ya lleva al login, no tiene sentido reintentar
          return;
        }
        if (!respuesta.ok || !respuesta.body) throw new Error(`stream ${respuesta.status}`);

        set({ conectado: true });
        espera = ESPERA_INICIAL_MS;
        void cargarLista(signal);

        const lector = respuesta.body.getReader();
        const decodificador = new TextDecoder();
        const parser = new SseParser();
        for (;;) {
          const { value, done } = await lector.read();
          if (done) break;
          for (const evento of parser.agregar(decodificador.decode(value, { stream: true }))) {
            if (evento.evento !== 'notificacion') continue;
            try {
              const nueva = normalizar(JSON.parse(evento.datos) as NotificacionDto);
              set((s) => ({ notificaciones: combinar([nueva], s.notificaciones) }));
            } catch {
              // payload que no era JSON: se ignora
            }
          }
        }
      } catch {
        if (signal.aborted) return;
      }
      set({ conectado: false });
      await esperar(espera, signal);
      espera = Math.min(espera * 2, ESPERA_MAXIMA_MS);
    }
  }

  return {
    notificaciones: [],
    conectado: false,

    iniciar: (token) => {
      if (controlador && tokenActual === token) return;
      get().detener();
      tokenActual = token;
      controlador = new AbortController();
      void escuchar(token, controlador.signal);
    },

    detener: () => {
      controlador?.abort();
      controlador = null;
      tokenActual = null;
      set({ notificaciones: [], conectado: false });
    },

    marcarLeida: (id) => marcarLocal((n) => n.id === id),
    marcarTodasLeidas: () => marcarLocal(() => true),
    marcarMensajesLeidos: () => marcarLocal((n) => n.tipo === 'MENSAJE_DIRECTO'),
  };
});
