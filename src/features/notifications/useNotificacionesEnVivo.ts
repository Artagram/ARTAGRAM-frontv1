import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/authStore';
import { refrescarSesion } from '../suscripcion/suscripcionApi';
import {
  TIPOS_SUSCRIPCION,
  TIPO_MENSAJE,
  cargarNoLeidas,
  conectarNotificaciones,
  marcarMensajesLeidos,
  type Notificacion,
} from './notificacionesApi';
import { useNotificacionesStore } from './notificacionesStore';

const RUTA_MENSAJES = '/mensajes';

function alRecibir(n: Notificacion) {
  if (n.tipo === TIPO_MENSAJE && window.location.pathname === RUTA_MENSAJES) {
    marcarMensajesLeidos().catch(() => undefined);
    return;
  }
  useNotificacionesStore.getState().recibir(n);
  if (TIPOS_SUSCRIPCION.includes(n.tipo)) {
    refrescarSesion()
      .then(useAuthStore.getState().iniciarSesion)
      .catch(() => undefined);
  }
}

/** Cada conexión recarga los contadores, así se recupera lo que llegó estando desconectado. */
export function useNotificacionesEnVivo() {
  const token = useAuthStore((s) => s.sesion?.accessToken);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!token) {
      useNotificacionesStore.getState().reiniciar();
      return;
    }
    const conexion = new AbortController();
    conectarNotificaciones({
      token,
      signal: conexion.signal,
      onAbierta: () => {
        cargarNoLeidas()
          .then(useNotificacionesStore.getState().fijarContadores)
          .catch(() => undefined);
      },
      onNotificacion: alRecibir,
    }).catch(() => undefined);
    return () => conexion.abort();
  }, [token]);

  useEffect(() => {
    if (!token || pathname !== RUTA_MENSAJES) return;
    useNotificacionesStore.getState().limpiarMensajes();
    marcarMensajesLeidos().catch(() => undefined);
  }, [token, pathname]);
}
