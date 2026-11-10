const PROPORCION_FUENTE = 90;
const FUENTE_MINIMA = 10;

export function dibujarMarca(ctx: CanvasRenderingContext2D, ancho: number, alto: number, texto: string) {
  const margen = Math.max(6, ancho / 100);
  let tamano = Math.max(FUENTE_MINIMA, ancho / PROPORCION_FUENTE);
  ctx.font = `${tamano}px sans-serif`;
  while (tamano > FUENTE_MINIMA && ctx.measureText(texto).width > ancho - 2 * margen) {
    tamano -= 1;
    ctx.font = `${tamano}px sans-serif`;
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.strokeText(texto, ancho - margen, alto - margen);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillText(texto, ancho - margen, alto - margen);
}

/** Trabaja sobre una copia para no ensuciar el lienzo que el usuario sigue viendo. */
export function exportarConMarca(canvas: HTMLCanvasElement, texto: string): string {
  const copia = document.createElement('canvas');
  copia.width = canvas.width;
  copia.height = canvas.height;
  const ctx = copia.getContext('2d');
  if (!ctx) {
    throw new Error('El navegador no permite exportar el lienzo');
  }
  ctx.drawImage(canvas, 0, 0);
  dibujarMarca(ctx, copia.width, copia.height, texto);
  return copia.toDataURL('image/png');
}
