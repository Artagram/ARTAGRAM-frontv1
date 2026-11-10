import { useState } from 'react';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import type { Seguimiento } from '../../types';

interface Props {
  usuarioId: string;
  loSigo: boolean;
  /** Avisa el nuevo estado (y el total de seguidores) para que quien lo usa actualice contadores o recargue el feed. */
  onCambio?: (seguimiento: Seguimiento) => void;
  className?: string;
}

export function BotonSeguir({ usuarioId, loSigo, onCambio, className }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alternar() {
    setEnviando(true);
    setError(null);
    try {
      // artagram-users expone seguir como un toggle: el mismo POST sigue o deja de seguir
      const { data } = await api.post<Seguimiento>(`/api/artistas/${usuarioId}/seguir`);
      onCambio?.(data);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo actualizar'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={loSigo ? 'secondary' : 'primary'}
        cargando={enviando}
        onClick={alternar}
        className={className}
        title={loSigo ? 'Dejar de seguir' : 'Seguir a este artista'}
      >
        {loSigo ? 'Siguiendo' : 'Seguir'}
      </Button>
      {error && <span className="text-[11px] text-coral-light">{error}</span>}
    </span>
  );
}
