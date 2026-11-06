import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from './api';
import { usePlanLimiteStore } from './planLimiteStore';

function responder(status: number, data: unknown) {
  api.defaults.adapter = (config: InternalAxiosRequestConfig) =>
    Promise.reject(new AxiosError('fallo', undefined, config, null, { status, data, config } as AxiosResponse));
  return api.get('/x').catch(() => undefined);
}

afterEach(() => usePlanLimiteStore.getState().cerrar());

describe('aviso de límite del plan', () => {
  it('se abre con el mensaje del servidor ante PLAN_LIMITE', async () => {
    await responder(403, { code: 'PLAN_LIMITE', message: 'Llegaste al límite' });

    expect(usePlanLimiteStore.getState().mensaje).toBe('Llegaste al límite');
  });

  it('no se abre con otros 403', async () => {
    await responder(403, { code: 'SIN_PERMISO', message: 'No' });

    expect(usePlanLimiteStore.getState().mensaje).toBeNull();
  });
});
