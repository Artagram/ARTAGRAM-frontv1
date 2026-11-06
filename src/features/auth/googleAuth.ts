import { api } from '../../lib/api';
import type { SesionUsuario } from '../../lib/authStore';

export interface RespuestaGoogle {
  requiereNombre: boolean;
  nombreSugerido: string | null;
  sesion: SesionUsuario | null;
}

export interface DisponibilidadNombre {
  disponible: boolean;
  sugerencias: string[];
}

export const NOMBRE_MIN = 3;
export const NOMBRE_MAX = 30;

export async function ingresarConGoogle(idToken: string): Promise<RespuestaGoogle> {
  const { data } = await api.post<RespuestaGoogle>('/api/auth/google', { idToken });
  return data;
}

export async function completarRegistro(idToken: string, nombreArtista: string): Promise<SesionUsuario> {
  const { data } = await api.post<SesionUsuario>('/api/auth/google/completar', { idToken, nombreArtista });
  return data;
}

/** Deja solo los caracteres que acepta el backend para un nombre de artista. */
export function limpiarNombreArtista(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9_]/g, '').slice(0, NOMBRE_MAX);
}
