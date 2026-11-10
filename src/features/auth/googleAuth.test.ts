import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { completarRegistro, ingresarConGoogle, limpiarNombreArtista } from './googleAuth';

vi.mock('../../lib/api', () => ({ api: { post: vi.fn() } }));

const sesion = {
  accessToken: 'jwt',
  usuarioId: 'u-1',
  nombreArtista: 'lucia',
  rolGlobal: 'USUARIO',
  premium: false,
};

describe('googleAuth', () => {
  beforeEach(() => vi.mocked(api.post).mockReset());

  it('envía el ID token de Google y devuelve la sesión', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { requiereNombre: false, nombreSugerido: null, sesion } });

    const respuesta = await ingresarConGoogle('id-token');

    expect(api.post).toHaveBeenCalledWith('/api/auth/google', { idToken: 'id-token' });
    expect(respuesta.sesion).toEqual(sesion);
  });

  it('indica cuándo una cuenta nueva debe elegir nombre', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { requiereNombre: true, nombreSugerido: 'lucia_mora', sesion: null } });

    const respuesta = await ingresarConGoogle('id-token');

    expect(respuesta.requiereNombre).toBe(true);
    expect(respuesta.nombreSugerido).toBe('lucia_mora');
  });

  it('completa el registro con el nombre elegido', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: sesion });

    await expect(completarRegistro('id-token', 'lucia')).resolves.toEqual(sesion);
    expect(api.post).toHaveBeenCalledWith('/api/auth/google/completar', { idToken: 'id-token', nombreArtista: 'lucia' });
  });

  it('limpia los caracteres no permitidos y recorta a 30', () => {
    expect(limpiarNombreArtista('Lucía Mora!')).toBe('LucaMora');
    expect(limpiarNombreArtista('a'.repeat(40))).toHaveLength(30);
  });
});
