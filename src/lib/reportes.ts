import type { MotivoReporte } from '../types';

/** Motivos de reporte del contrato, con el texto que ve el usuario. */
export const MOTIVOS_REPORTE: { id: MotivoReporte; texto: string }[] = [
  { id: 'SPAM', texto: 'Spam o publicidad' },
  { id: 'CONTENIDO_INAPROPIADO', texto: 'Contenido inapropiado' },
  { id: 'PLAGIO', texto: 'Plagio o robo de obra' },
  { id: 'ACOSO', texto: 'Acoso u ofensas' },
  { id: 'OTRO', texto: 'Otro motivo' },
];
