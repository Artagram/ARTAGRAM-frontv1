import { describe, expect, it } from 'vitest';
import { motivoRecomendacion, type ArtistaRecomendado } from './recomendacionesApi';

const artista = (enComun: number, seguidores: number): ArtistaRecomendado => ({
  usuarioId: 'u1',
  nombreArtista: 'Ana',
  fotoUrl: null,
  seguidores,
  enComun,
});

describe('motivoRecomendacion', () => {
  it('prefiere explicar la relacion con quienes sigues', () => {
    expect(motivoRecomendacion(artista(1, 9))).toBe('Lo sigue alguien que sigues');
    expect(motivoRecomendacion(artista(3, 9))).toBe('Lo siguen 3 personas que sigues');
  });

  it('sin relacion muestra los seguidores', () => {
    expect(motivoRecomendacion(artista(0, 1))).toBe('1 seguidor');
    expect(motivoRecomendacion(artista(0, 12))).toBe('12 seguidores');
  });
});
