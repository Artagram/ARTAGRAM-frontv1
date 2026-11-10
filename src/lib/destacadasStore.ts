import { create } from 'zustand';
import { api } from './api';
import type { PerfilResponse } from '../types';

/** Mismo tope que muestra el editor del perfil. */
export const MAX_DESTACADAS = 3;

type ObraDestacada = PerfilResponse['obrasDestacadas'][number];

interface DestacadasState {
  /** Obras destacadas del usuario; null mientras no se cargaron. */
  obras: ObraDestacada[] | null;
  cargar: () => Promise<void>;
  /** Destaca la obra o la quita si ya estaba. Lanza Error con un mensaje para mostrar si no se puede. */
  alternar: (obra: ObraDestacada) => Promise<void>;
  limpiar: () => void;
}

// Varias tarjetas del feed piden la lista a la vez al montarse: se comparte una sola petición
let cargaEnCurso: Promise<void> | null = null;

/**
 * Obras destacadas del perfil propio (artagram-users). No hay un endpoint para
 * destacar una sola: PUT /api/perfil/me reemplaza la lista entera, así que se
 * parte siempre de la lista actual del servidor.
 */
export const useDestacadasStore = create<DestacadasState>((set, get) => ({
  obras: null,

  cargar: () => {
    if (get().obras) return Promise.resolve();
    cargaEnCurso ??= api
      .get<PerfilResponse>('/api/perfil/me')
      .then((r) => set({ obras: r.data.obrasDestacadas }))
      .catch(() => {})
      .finally(() => {
        cargaEnCurso = null;
      });
    return cargaEnCurso;
  },

  alternar: async (obra) => {
    const { data: perfil } = await api.get<PerfilResponse>('/api/perfil/me');
    const actuales = perfil.obrasDestacadas;
    const yaEsta = actuales.some((o) => o.imagenUrl === obra.imagenUrl);
    if (!yaEsta && actuales.length >= MAX_DESTACADAS) {
      set({ obras: actuales });
      throw new Error(`Ya tienes ${MAX_DESTACADAS} obras destacadas. Quita una desde tu perfil.`);
    }
    const nuevas = yaEsta
      ? actuales.filter((o) => o.imagenUrl !== obra.imagenUrl)
      : [...actuales, { titulo: obra.titulo.slice(0, 150), imagenUrl: obra.imagenUrl }];
    // Solo obrasDestacadas: artagram-users deja intacto lo que llegue en null
    const { data } = await api.put<PerfilResponse>('/api/perfil/me', { obrasDestacadas: nuevas });
    set({ obras: data.obrasDestacadas });
  },

  limpiar: () => set({ obras: null }),
}));
