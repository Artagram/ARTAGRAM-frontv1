import { create } from 'zustand';
import { TIPO_MENSAJE, type NoLeidas, type Notificacion } from './notificacionesApi';

interface NotificacionesState {
  lista: Notificacion[];
  noLeidas: number;
  mensajes: number;
  fijarLista: (lista: Notificacion[]) => void;
  fijarContadores: (contadores: NoLeidas) => void;
  recibir: (n: Notificacion) => void;
  marcarLeida: (id: string) => void;
  marcarTodas: () => void;
  limpiarMensajes: () => void;
  reiniciar: () => void;
}

export const useNotificacionesStore = create<NotificacionesState>((set) => ({
  lista: [],
  noLeidas: 0,
  mensajes: 0,
  fijarLista: (lista) => set({ lista }),
  fijarContadores: ({ notificaciones, mensajes }) => set({ noLeidas: notificaciones, mensajes }),
  recibir: (n) =>
    set((s) => {
      if (n.tipo === TIPO_MENSAJE) return { mensajes: s.mensajes + 1 };
      if (s.lista.some((actual) => actual.id === n.id)) return s;
      return { lista: [n, ...s.lista], noLeidas: s.noLeidas + 1 };
    }),
  marcarLeida: (id) =>
    set((s) => {
      if (!s.lista.some((n) => n.id === id && !n.leida)) return s;
      return {
        lista: s.lista.map((n) => (n.id === id ? { ...n, leida: true } : n)),
        noLeidas: Math.max(0, s.noLeidas - 1),
      };
    }),
  marcarTodas: () => set((s) => ({ lista: s.lista.map((n) => ({ ...n, leida: true })), noLeidas: 0 })),
  limpiarMensajes: () => set({ mensajes: 0 }),
  reiniciar: () => set({ lista: [], noLeidas: 0, mensajes: 0 }),
}));
