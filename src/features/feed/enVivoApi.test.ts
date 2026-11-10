import { describe, expect, it } from 'vitest';
import { destinoArtista, textoActividad, type ArtistaEnVivo } from './enVivoApi';

const base: ArtistaEnVivo = {
  usuarioId: 'u1',
  nombreArtista: 'Ana María',
  fotoUrl: null,
  tipo: 'LIENZO',
  comunidadId: 'c1',
  iniciadaEn: '2026-11-06T10:00:00Z',
};

describe('enVivoApi', () => {
  it('lleva a la comunidad cuando dibuja en un lienzo', () => {
    expect(destinoArtista(base)).toBe('/comunidades/c1');
    expect(textoActividad(base)).toBe('En un lienzo');
  });

  it('en Modo Fiesta solo lleva al perfil', () => {
    const fiesta: ArtistaEnVivo = { ...base, tipo: 'FIESTA', comunidadId: null };

    expect(destinoArtista(fiesta)).toBe('/perfil/Ana%20Mar%C3%ADa');
    expect(textoActividad(fiesta)).toBe('En Modo Fiesta');
  });
});
