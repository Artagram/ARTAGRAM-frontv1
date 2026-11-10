import { api } from '../../lib/api';
import type { PublicacionDto } from '../../types';

export const OBRAS_POR_PAGINA = 12;

interface PaginaObras {
  content: PublicacionDto[];
  last: boolean;
}

export async function cargarDestacadas(autorId: string): Promise<PublicacionDto[]> {
  const { data } = await api.get<PublicacionDto[]>(`/api/publicaciones/artista/${autorId}/destacadas`);
  return data;
}

export async function cargarObras(autorId: string, pagina: number): Promise<PaginaObras> {
  const { data } = await api.get<PaginaObras>(`/api/publicaciones/artista/${autorId}`, {
    params: { pagina, tamano: OBRAS_POR_PAGINA },
  });
  return data;
}

export async function alternarDestacada(obra: PublicacionDto): Promise<PublicacionDto> {
  const url = `/api/publicaciones/${obra.id}/destacar`;
  const { data } = obra.destacada ? await api.delete<PublicacionDto>(url) : await api.put<PublicacionDto>(url);
  return data;
}

export function reemplazarObra(obras: PublicacionDto[], obra: PublicacionDto): PublicacionDto[] {
  return obras.map((o) => (o.id === obra.id ? obra : o));
}

/** La obra recien destacada va primero, igual que la ordena el servidor. */
export function actualizarDestacadas(destacadas: PublicacionDto[], obra: PublicacionDto): PublicacionDto[] {
  const resto = destacadas.filter((o) => o.id !== obra.id);
  return obra.destacada ? [obra, ...resto] : resto;
}
