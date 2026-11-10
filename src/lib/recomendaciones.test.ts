import { describe, expect, it } from 'vitest';
import { recomendarArtistas } from './recomendaciones';
import type { PublicacionDto } from '../types';

let secuencia = 0;
function publicacion(autorId: string, cambios: Partial<PublicacionDto> = {}): PublicacionDto {
  secuencia += 1;
  return {
    id: `p${secuencia}`,
    autorId,
    autorNombre: `artista_${autorId}`,
    titulo: 'Obra',
    descripcion: '',
    obraFinalUrl: '',
    imagenesProcesoUrls: [],
    etiquetas: [],
    contadorLikes: 0,
    meGusta: false,
    creadoEn: '2026-11-01T00:00:00Z',
    ...cambios,
  };
}

describe('recomendarArtistas', () => {
  it('excluye al propio usuario y a los artistas que ya sigue', () => {
    const pubs = [publicacion('yo'), publicacion('seguido'), publicacion('nuevo')];
    const resultado = recomendarArtistas(pubs, 'yo', new Set(['seguido']));
    expect(resultado.map((r) => r.autorId)).toEqual(['nuevo']);
  });

  it('prioriza artistas cuyas obras ya te gustaron sobre los solo populares', () => {
    const pubs = [
      publicacion('popular', { contadorLikes: 20 }),
      publicacion('favorito', { meGusta: true, contadorLikes: 1 }),
    ];
    const resultado = recomendarArtistas(pubs, 'yo', new Set());
    expect(resultado[0]).toMatchObject({ autorId: 'favorito', motivo: 'Te gustaron sus obras' });
    expect(resultado[1]).toMatchObject({ autorId: 'popular', motivo: 'Popular en Artagram' });
  });

  it('suma puntos por etiquetas en común con las obras que te gustaron (sin distinguir mayúsculas)', () => {
    const pubs = [
      publicacion('favorito', { meGusta: true, etiquetas: ['Acuarela'] }),
      publicacion('afin', { etiquetas: ['acuarela'], contadorLikes: 2 }),
      publicacion('ajeno', { etiquetas: ['pixelart'], contadorLikes: 5 }),
    ];
    const resultado = recomendarArtistas(pubs, 'yo', new Set(['favorito']));
    expect(resultado.map((r) => r.autorId)).toEqual(['afin', 'ajeno']);
    expect(resultado[0].motivo).toBe('También pinta #acuarela');
  });

  it('agrupa las obras de un mismo autor y respeta el límite', () => {
    const pubs = [
      publicacion('a', { contadorLikes: 3 }),
      publicacion('a', { contadorLikes: 4 }),
      publicacion('b', { contadorLikes: 5 }),
      publicacion('c', { contadorLikes: 1 }),
    ];
    const resultado = recomendarArtistas(pubs, 'yo', new Set(), 2);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({ autorId: 'a', puntaje: 7 });
    expect(resultado[1].autorId).toBe('b');
  });
});
