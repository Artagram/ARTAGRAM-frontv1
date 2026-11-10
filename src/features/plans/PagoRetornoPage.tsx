import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { FondoEstudio } from '../../components/layout/FondoEstudio';
import type { SuscripcionDto } from '../../types';

type Estado = 'confirmando' | 'exito' | 'pendiente' | 'rechazado' | 'error';

/**
 * Página a la que vuelve el proveedor de pagos (retornoUrl del checkout). Trae
 * los parámetros de Mercado Pago: collection_status (approved | pending |
 * rejected | null) y external_reference (id de la transacción).
 */
export function PagoRetornoPage() {
  const [params] = useSearchParams();
  const actualizarSesion = useAuthStore((s) => s.actualizarSesion);
  const [estadoConfirmacion, setEstado] = useState<Estado>('confirmando');
  const [error, setError] = useState<string | null>(null);
  const [fechaFin, setFechaFin] = useState<string | null>(null);
  // StrictMode monta dos veces en desarrollo: la confirmación no debe mandarse dos veces
  const confirmado = useRef(false);

  const resultado = params.get('collection_status') ?? params.get('status');
  const transaccion = params.get('external_reference') ?? params.get('payment_id');

  // Pendiente o rechazado se sabe con solo leer la URL; solo lo aprobado se confirma con el backend
  const estadoSegunUrl: Estado | null =
    resultado === 'pending' || resultado === 'in_process'
      ? 'pendiente'
      : resultado !== 'approved' || !transaccion
        ? 'rechazado'
        : null;
  const estado = estadoSegunUrl ?? estadoConfirmacion;

  useEffect(() => {
    if (estadoSegunUrl || !transaccion || confirmado.current) return;
    confirmado.current = true;

    (async () => {
      try {
        await api.post('/api/suscripcion/confirmar', null, { params: { tx: transaccion } });
        const { data } = await api.get<SuscripcionDto>('/api/suscripcion/actual');
        if (!data.premium) throw new Error('El pago se registró pero el plan aún no aparece activo');
        actualizarSesion({ premium: true });
        setFechaFin(data.fechaFin);
        setEstado('exito');
      } catch (err) {
        setError(err instanceof Error && !axios.isAxiosError(err) ? err.message : extraerMensajeError(err));
        setEstado('error');
      }
    })();
  }, [estadoSegunUrl, transaccion, actualizarSesion]);

  const contenido: Record<Estado, { icono: string; titulo: string; texto: string }> = {
    confirmando: { icono: '⏳', titulo: 'Confirmando tu pago…', texto: 'Esto toma solo un momento.' },
    exito: {
      icono: '⭐',
      titulo: '¡Ya eres Premium!',
      texto: fechaFin
        ? `Tu plan está activo hasta el ${new Date(fechaFin).toLocaleDateString('es')}.`
        : 'Tu plan Premium ya está activo.',
    },
    pendiente: {
      icono: '🕒',
      titulo: 'Tu pago está en proceso',
      texto: 'Te avisaremos con una notificación cuando el proveedor lo apruebe.',
    },
    rechazado: { icono: '✕', titulo: 'El pago no se completó', texto: 'No se hizo ningún cobro. Puedes intentarlo de nuevo.' },
    error: { icono: '⚠️', titulo: 'No pudimos activar tu plan', texto: error ?? 'Intenta de nuevo en unos minutos.' },
  };
  const { icono, titulo, texto } = contenido[estado];

  return (
    <FondoEstudio>
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex w-full max-w-md flex-col items-center gap-3 p-8 text-center"
        >
          <div className="text-4xl" aria-hidden>
            {estado === 'confirmando' ? (
              <span className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-coral border-t-transparent" />
            ) : (
              icono
            )}
          </div>
          <h1 className="font-display text-xl font-semibold">{titulo}</h1>
          <p className="text-sm text-paper-muted">{texto}</p>
          {estado === 'exito' && (
            <p className="text-xs text-paper-dim">
              El historial ampliado del chat se activa la próxima vez que inicies sesión.
            </p>
          )}
          {estado !== 'confirmando' && (
            <div className="mt-2 flex gap-2">
              <Link to="/planes" className={estado === 'exito' ? 'btn-secondary' : 'btn-primary'}>
                {estado === 'exito' ? 'Ver mi plan' : 'Volver a planes'}
              </Link>
              {estado === 'exito' && (
                <Link to="/comunidades" className="btn-primary">
                  Ir a comunidades
                </Link>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </FondoEstudio>
  );
}
