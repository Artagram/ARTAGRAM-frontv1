import { api } from '../../lib/api';

/** El servidor solo entrega la version con marca de agua; el original no se descarga. */
export async function descargarObra(publicacionId: string): Promise<void> {
  const { data } = await api.get<{ url: string }>(`/api/publicaciones/${publicacionId}/descargar`);
  const enlace = document.createElement('a');
  enlace.href = data.url;
  enlace.download = '';
  enlace.click();
}
