import { describe, expect, it } from 'vitest';
import { aplicarEventoPresencia } from './presencia';
import type { ArtistaDibujandoDto } from '../types';

function artista(usuarioId: string, cambios: Partial<ArtistaDibujandoDto> = {}): ArtistaDibujandoDto {
  return {
    usuarioId,
    nombreArtista: `artista_${usuarioId}`,
    lugar: 'LIENZO',
    comunidadId: 'c1',
    comunidadNombre: 'Pixel Studio',
    salaId: null,
    desde: '2026-11-10T00:00:00Z',
    ...cambios,
  };
}

describe('aplicarEventoPresencia', () => {
  it('agrega al inicio a quien empieza a dibujar', () => {
    const lista = aplicarEventoPresencia([artista('a')], { tipo: 'EMPEZO_A_DIBUJAR', artista: artista('b') });
    expect(lista.map((a) => a.usuarioId)).toEqual(['b', 'a']);
  });

  it('no duplica: si ya estaba, lo actualiza con el lugar nuevo', () => {
    const lista = aplicarEventoPresencia([artista('a')], {
      tipo: 'EMPEZO_A_DIBUJAR',
      artista: artista('a', { lugar: 'FIESTA', comunidadId: null }),
    });
    expect(lista).toHaveLength(1);
    expect(lista[0].lugar).toBe('FIESTA');
  });

  it('quita a quien deja de dibujar', () => {
    const lista = aplicarEventoPresencia([artista('a'), artista('b')], { tipo: 'DEJO_DE_DIBUJAR', artista: artista('a') });
    expect(lista.map((a) => a.usuarioId)).toEqual(['b']);
  });
});
