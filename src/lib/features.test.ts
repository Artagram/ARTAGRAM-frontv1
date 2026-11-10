import { afterEach, describe, expect, it, vi } from 'vitest';
import { funcionActiva } from './features';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe('funcionActiva', () => {
  it('sigue a la variable VITE_FEATURE_* del entorno', () => {
    vi.stubEnv('VITE_FEATURE_REPORTES', 'false');
    expect(funcionActiva('reportes')).toBe(false);
    vi.stubEnv('VITE_FEATURE_REPORTES', 'true');
    expect(funcionActiva('reportes')).toBe(true);
  });

  it('localStorage tiene prioridad sobre el entorno, para probar', () => {
    vi.stubEnv('VITE_FEATURE_PRESENCIA', 'true');
    localStorage.setItem('artagram.features', '{"reportes":true,"presencia":false}');
    expect(funcionActiva('reportes')).toBe(true);
    expect(funcionActiva('presencia')).toBe(false);
  });

  it('ignora un valor de localStorage que no es JSON válido', () => {
    vi.stubEnv('VITE_FEATURE_REPORTES', 'false');
    localStorage.setItem('artagram.features', '{roto');
    expect(funcionActiva('reportes')).toBe(false);
  });
});
