import { api } from '../../lib/api';

export type MotivoReporte = 'CONTENIDO_INAPROPIADO' | 'PLAGIO' | 'SPAM' | 'OTRO';
export type AccionModeracion = 'OCULTAR' | 'RESTAURAR';

export const MOTIVOS: Record<MotivoReporte, string> = {
  CONTENIDO_INAPROPIADO: 'Contenido inapropiado',
  PLAGIO: 'Plagio',
  SPAM: 'Spam',
  OTRO: 'Otro',
};

export interface ReporteAgrupado {
  publicacionId: string;
  titulo: string;
  imagenUrl: string;
  autorNombre: string;
  oculta: boolean;
  total: number;
  motivos: Partial<Record<MotivoReporte, number>>;
  detalles: string[];
  ultimoEn: string;
}

export async function reportarObra(publicacionId: string, motivo: MotivoReporte, detalle: string): Promise<void> {
  await api.post(`/api/publicaciones/${publicacionId}/reportar`, { motivo, detalle: detalle.trim() || null });
}

export async function cargarReportes(): Promise<ReporteAgrupado[]> {
  const { data } = await api.get<ReporteAgrupado[]>('/api/moderacion/reportes');
  return data;
}

export async function resolverReporte(publicacionId: string, accion: AccionModeracion): Promise<void> {
  await api.post(`/api/moderacion/publicaciones/${publicacionId}/resolver`, { accion });
}

export async function procesarObrasSinMarca(): Promise<number> {
  const { data } = await api.post<{ enviadas: number }>('/api/moderacion/marcas/procesar');
  return data.enviadas;
}

export function resumirMotivos(motivos: ReporteAgrupado['motivos']): string {
  return (Object.entries(motivos) as [MotivoReporte, number][])
    .sort(([, a], [, b]) => b - a)
    .map(([motivo, cantidad]) => `${MOTIVOS[motivo]} (${cantidad})`)
    .join(' · ');
}
