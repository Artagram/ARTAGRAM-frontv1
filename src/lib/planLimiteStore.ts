import { create } from 'zustand';

interface PlanLimiteState {
  mensaje: string | null;
  abrir: (mensaje: string) => void;
  cerrar: () => void;
}

export const usePlanLimiteStore = create<PlanLimiteState>((set) => ({
  mensaje: null,
  abrir: (mensaje) => set({ mensaje }),
  cerrar: () => set({ mensaje: null }),
}));
