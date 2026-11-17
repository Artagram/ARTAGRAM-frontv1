import { useEstadoConexion } from '../../lib/useEstadoConexion';

/**
 * Aviso mientras se recupera la conexion en tiempo real (escenario 4): lo que
 * se dibuje mientras tanto queda en cola y el lienzo se vuelve a pedir al
 * servidor al reconectar.
 */
export function IndicadorConexion() {
  const estado = useEstadoConexion();
  if (estado !== 'reconectando') return null;
  return (
    <div role="status" className="banner-aviso flex items-center gap-2 py-1.5 text-xs">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-coral" aria-hidden="true" />
      <span>Se perdió la conexión. Reconectando… lo que dibujes se enviará al volver.</span>
    </div>
  );
}
