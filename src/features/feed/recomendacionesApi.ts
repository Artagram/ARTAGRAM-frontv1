import { api } from '../../lib/api';

export interface ArtistaRecomendado {
  usuarioId: string;
  nombreArtista: string;
  fotoUrl: string | null;
  seguidores: number;
  enComun: number;
}

const ARTISTAS_VISIBLES = 5;

export async function cargarArtistasRecomendados(): Promise<ArtistaRecomendado[]> {
  const { data } = await api.get<ArtistaRecomendado[]>('/api/artistas/recomendados', { params: { limite: ARTISTAS_VISIBLES } });
  return data;
}

export function motivoRecomendacion({ enComun, seguidores }: ArtistaRecomendado): string {
  if (enComun === 1) return 'Lo sigue alguien que sigues';
  if (enComun > 1) return `Lo siguen ${enComun} personas que sigues`;
  return seguidores === 1 ? '1 seguidor' : `${seguidores} seguidores`;
}
