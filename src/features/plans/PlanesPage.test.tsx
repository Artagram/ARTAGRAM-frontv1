import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { PlanesPage } from './PlanesPage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

describe('PlanesPage', () => {
  it('sigue mostrando el plan si el servicio de pagos no responde', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('sin servicio'));
    const contenedor = document.createElement('div');
    await act(async () => createRoot(contenedor).render(<PlanesPage />));

    expect(contenedor.textContent).toContain('Plan actual');
    expect(contenedor.textContent).toContain('Gratis');
    expect(contenedor.textContent).toContain('Pasar a PRO');
  });
});
