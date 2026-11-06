import { describe, expect, it, vi } from 'vitest';
import { dibujarMarca } from './marcaAgua';

function contexto(anchoPorLetra: number) {
  const ctx = {
    font: '',
    measureText: vi.fn((t: string) => ({ width: t.length * anchoPorLetra * parseFloat(ctx.font.replace('bold ', '')) })),
    strokeText: vi.fn(),
    fillText: vi.fn(),
  };
  return ctx;
}

describe('dibujarMarca', () => {
  it('escribe el texto en la esquina inferior derecha', () => {
    const ctx = contexto(0.01);

    dibujarMarca(ctx as unknown as CanvasRenderingContext2D, 1200, 800, '© Lienzo · Artagram');

    expect(ctx.fillText).toHaveBeenCalledWith('© Lienzo · Artagram', 1180, 780);
  });

  it('reduce la fuente hasta que el texto cabe', () => {
    const ctx = contexto(2);
    const texto = 'un texto bastante largo para este lienzo';

    dibujarMarca(ctx as unknown as CanvasRenderingContext2D, 2000, 300, texto);

    const tamano = parseFloat(ctx.font.replace('bold ', ''));
    expect(tamano).toBeLessThan(2000 / 40);
    expect(texto.length * 2 * tamano).toBeLessThanOrEqual(2000);
  });
});
