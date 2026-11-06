import { api } from '../../lib/api';
import type { AnalisisObraDto } from '../../types';

export const ESTADO_PENDIENTE = 'PENDIENTE';

const INTERVALO_MS = 2000;
const INTENTOS = 45;

/** El análisis corre en segundo plano: se consulta hasta que deje de estar pendiente. */
export async function esperarAnalisis(publicacionId: string, intervaloMs = INTERVALO_MS): Promise<AnalisisObraDto> {
  for (let intento = 0; intento < INTENTOS; intento++) {
    const { data } = await api.get<AnalisisObraDto>(`/api/publicaciones/${publicacionId}/analisis`);
    if (data.estado !== ESTADO_PENDIENTE) {
      return data;
    }
    await new Promise((resolver) => setTimeout(resolver, intervaloMs));
  }
  throw new Error('El análisis está tardando más de lo esperado');
}
