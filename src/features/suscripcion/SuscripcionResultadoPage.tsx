import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/authStore';
import {
  confirmarPagoSimulado,
  esperarPremium,
  leerResultadoPago,
  PREFIJO_SIMULADO,
  refrescarSesion,
} from './suscripcionApi';

type Estado = 'procesando' | 'activo' | 'demorado';

const MENSAJES: Record<Estado, { titulo: string; texto: string }> = {
  procesando: { titulo: 'Confirmando tu pago…', texto: 'Esto toma unos segundos.' },
  activo: { titulo: '¡Ya eres PRO!', texto: 'Tus beneficios están activos.' },
  demorado: {
    titulo: 'Tu pago se está procesando',
    texto: 'Activaremos tu plan apenas Mercado Pago lo confirme. Te avisaremos con una notificación.',
  },
};

export function SuscripcionResultadoPage() {
  const [params] = useSearchParams();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const nombreArtista = useAuthStore((s) => s.sesion?.nombreArtista);
  const resultado = leerResultadoPago(params);
  const [estado, setEstado] = useState<Estado>('procesando');

  useEffect(() => {
    if (resultado !== 'aprobado') return;
    let activo = true;
    const referencia = params.get('external_reference') ?? '';
    const confirmar = referencia.startsWith(PREFIJO_SIMULADO)
      ? confirmarPagoSimulado(referencia)
      : Promise.resolve();
    confirmar
      .then(() => esperarPremium(refrescarSesion))
      .then((sesion) => {
        if (!activo) return;
        if (sesion) iniciarSesion(sesion);
        setEstado(sesion?.premium ? 'activo' : 'demorado');
      })
      .catch(() => activo && setEstado('demorado'));
    return () => {
      activo = false;
    };
  }, [resultado, params, iniciarSesion]);

  const mensaje =
    resultado === 'rechazado'
      ? { titulo: 'El pago no se completó', texto: 'No se hizo ningún cobro. Puedes intentarlo de nuevo desde tu perfil.' }
      : resultado === 'pendiente'
        ? MENSAJES.demorado
        : MENSAJES[estado];

  const borde = resultado === 'rechazado' ? 'borde-fiesta' : resultado !== 'pendiente' && estado === 'activo' ? 'borde-comunidad' : 'borde-pro';

  return (
    <div className="flex min-h-[calc(100vh-var(--alto-barra))] items-center justify-center px-4 py-12">
      <div className={`card card-fija flex w-full max-w-md flex-col gap-3 p-8 text-center ${borde}`}>
        <h1 className="font-display text-[32px] font-semibold leading-tight">{mensaje.titulo}</h1>
        <p className="text-sm text-paper-muted">{mensaje.texto}</p>
        {nombreArtista && (
          <Link to={`/perfil/${nombreArtista}`} className="btn-secondary mt-3">
            Ir a mi perfil
          </Link>
        )}
      </div>
    </div>
  );
}
