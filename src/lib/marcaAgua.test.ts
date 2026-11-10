import { describe, expect, it } from 'vitest';
import { calcularDisenoMarca, nombreArchivoObra } from './marcaAgua';

describe('calcularDisenoMarca', () => {
  it('escala la marca con el lado menor de la imagen', () => {
    const chica = calcularDisenoMarca(800, 600);
    const grande = calcularDisenoMarca(4000, 3000);
    expect(grande.fuenteSello).toBeGreaterThan(chica.fuenteSello);
    expect(grande.fuenteTrama).toBe(150);
    expect(grande.separacion).toBe(grande.fuenteTrama * 3);
  });

  it('respeta mínimos legibles en imágenes muy chicas', () => {
    const diseno = calcularDisenoMarca(100, 80);
    expect(diseno.fuenteSello).toBe(12);
    expect(diseno.fuenteTrama).toBe(14);
    expect(diseno.margen).toBe(8);
  });
});

describe('nombreArchivoObra', () => {
  it('quita tildes y caracteres raros, y agrega el sufijo de Artagram', () => {
    expect(nombreArchivoObra('Jardín al amanecer!', 'Lucía Mora')).toBe('jardin-al-amanecer_lucia-mora_artagram.jpg');
  });

  it('usa "obra" si no queda nada utilizable', () => {
    expect(nombreArchivoObra('¿¿??', '')).toBe('obra_artagram.jpg');
  });
});
