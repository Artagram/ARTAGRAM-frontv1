import { useState } from 'react';
import { extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { crearCheckout } from './suscripcionApi';

// Mientras no este configurado Mercado Pago, el boton solo informa.
const PAGOS_ACTIVOS = import.meta.env.VITE_PAGOS_ACTIVOS === 'true';

export function BotonPro() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState(false);

  async function pasarAPro() {
    if (!PAGOS_ACTIVOS) {
      setAviso(true);
      return;
    }
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
      <Button variant="pro" onClick={pasarAPro} cargando={enviando}>
        Pasar a PRO
      </Button>
      {error && <p className="banner-error mt-2">{error}</p>}
      {aviso && (
        <p role="status" className="banner-aviso mt-2">
          Esta función está en proceso. Muy pronto podrás pasar a PRO.
        </p>
      )}
    </div>
  );
}
