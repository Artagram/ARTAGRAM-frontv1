import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/authStore';
import { destinoNotificacion, marcarLeida, type Notificacion } from './notificacionesApi';
import { useNotificacionesStore } from './notificacionesStore';

export function useAbrirNotificacion() {
  const navigate = useNavigate();
  const nombrePropio = useAuthStore((s) => s.sesion?.nombreArtista ?? '');

  return (n: Notificacion) => {
    if (!n.leida) {
      useNotificacionesStore.getState().marcarLeida(n.id);
      marcarLeida(n.id).catch(() => undefined);
    }
    const destino = destinoNotificacion(n, nombrePropio);
    if (destino) navigate(destino);
  };
}
