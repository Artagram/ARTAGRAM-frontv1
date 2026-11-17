import { useSyncExternalStore } from 'react';
import { stompService, type EstadoConexion } from './stompClient';

export function useEstadoConexion(): EstadoConexion {
  return useSyncExternalStore(
    (avisar) => stompService.alCambiarEstado(avisar),
    () => stompService.obtenerEstado(),
  );
}
