import { api } from '../../lib/api';

export interface ArtistaEnVivo {
  usuarioId: string;
  nombreArtista: string;
  fotoUrl: string | null;
  tipo: 'LIENZO' | 'FIESTA';
  comunidadId: string | null;
  iniciadaEn: string;
}

export const INTERVALO_EN_VIVO_MS = 30_000;

export async function cargarArtistasEnVivo(): Promise<ArtistaEnVivo[]> {
  const { data } = await api.get<ArtistaEnVivo[]>('/api/artistas/siguiendo/en-vivo');
  return data;
}

/** Las salas de fiesta son privadas por código: de ellas solo se abre el perfil. */
export function destinoArtista(artista: ArtistaEnVivo): string {
  return artista.comunidadId ? `/comunidades/${artista.comunidadId}` : `/perfil/${encodeURIComponent(artista.nombreArtista)}`;
}

export function textoActividad(artista: ArtistaEnVivo): string {
  return artista.tipo === 'FIESTA' ? 'En Modo Fiesta' : 'En un lienzo';
}
