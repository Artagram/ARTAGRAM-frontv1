import { useState } from 'react';
import { extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { crearCheckout } from './suscripcionApi';

export function BotonPro() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pasarAPro() {
    setError(null);
    setEnviando(true);
    try {
      window.location.assign(await crearCheckout(`${window.location.origin}/suscripcion/resultado`));
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos iniciar el pago, intenta de nuevo'));
      setEnviando(false);
    }
  }

  return (
    <div>
      <Button onClick={pasarAPro} cargando={enviando}>
        Pasar a PRO
      </Button>
      {error && <p className="mt-2 text-sm text-coral">{error}</p>}
    </div>
  );
}
