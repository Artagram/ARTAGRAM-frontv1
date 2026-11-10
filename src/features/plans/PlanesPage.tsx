import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { Button } from '../../components/ui/Button';
import { FondoEstudio } from '../../components/layout/FondoEstudio';
import type { CheckoutResponse, SuscripcionDto } from '../../types';

/**
 * Lo que de verdad cambia entre planes según el backend: tope de comunidades
 * (artagram-canvas), días de historial del chat de comunidad (artagram-chat) y
 * cuota de almacenamiento (artagram-payment).
 */
const PLANES = [
  {
    id: 'GRATIS',
    nombre: 'Gratis',
    beneficios: ['Hasta 3 comunidades creadas', 'Historial del chat de comunidad: 30 días', '512 MB y hasta 50 obras'],
  },
  {
    id: 'PRO',
    nombre: 'Premium',
    beneficios: [
      'Comunidades ilimitadas',
      'Historial del chat de comunidad: 1 año',
      '5 GB y hasta 500 obras',
      'Insignia ⭐ Premium en tu perfil',
    ],
  },
] as const;

function BarraUso({ etiqueta, usado, maximo, unidad }: { etiqueta: string; usado: number; maximo: number; unidad: string }) {
  const porcentaje = maximo > 0 ? Math.min(100, Math.round((usado / maximo) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-paper-muted">
        <span>{etiqueta}</span>
        <span>
          {usado} / {maximo} {unidad}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-800">
        <div className={clsx('h-full rounded-full', porcentaje >= 90 ? 'bg-coral' : 'bg-violet')} style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

export function PlanesPage() {
  const actualizarSesion = useAuthStore((s) => s.actualizarSesion);
  const premiumEnSesion = useAuthStore((s) => s.sesion?.premium ?? false);
  const [suscripcion, setSuscripcion] = useState<SuscripcionDto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SuscripcionDto>('/api/suscripcion/actual')
      .then((r) => {
        setSuscripcion(r.data);
        // La sesión guarda premium desde el login: si se pagó después, se refleja ya. Solo se
        // sube, nunca se baja: auth puede marcar premium a cuentas que payment no conoce (seed).
        if (r.data.premium) actualizarSesion({ premium: true });
      })
      .catch((err) => setError(extraerMensajeError(err, 'No se pudo cargar tu plan')))
      .finally(() => setCargando(false));
  }, [actualizarSesion]);

  async function pasarAPremium() {
    setPagando(true);
    setError(null);
    try {
      const { data } = await api.post<CheckoutResponse>('/api/suscripcion/checkout', {
        plan: 'PRO',
        retornoUrl: `${window.location.origin}/planes/retorno`,
      });
      // Se sale de la app hacia el proveedor; él vuelve a /planes/retorno con el resultado
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo iniciar el pago'));
      setPagando(false);
    }
  }

  const premium = (suscripcion?.premium ?? false) || premiumEnSesion;

  return (
    <FondoEstudio>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">Tu plan</h1>
          <p className="text-sm text-paper-muted">Pásate a Premium para crear sin límites con tu comunidad.</p>
        </div>

        {error && <p className="mb-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}

        {cargando ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
          </div>
        ) : (
          <>
            {suscripcion && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card mb-6 flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-paper-muted">Plan actual:</span>
                    {premium ? (
                      <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                        ⭐ Premium
                      </span>
                    ) : (
                      <span className="chip text-xs">Gratis</span>
                    )}
                  </div>
                  {premium && suscripcion.fechaFin && (
                    <span className="text-xs text-paper-dim">
                      Activo hasta el {format(new Date(suscripcion.fechaFin), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <BarraUso etiqueta="Almacenamiento" usado={suscripcion.megabytesUsados} maximo={suscripcion.maxMegabytes} unidad="MB" />
                  <BarraUso etiqueta="Obras" usado={suscripcion.obrasSubidas} maximo={suscripcion.maxObras} unidad="" />
                </div>
              </motion.div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {PLANES.map((plan) => {
                const esActual = (plan.id === 'PRO') === premium;
                return (
                  <div
                    key={plan.id}
                    className={clsx('card flex flex-col gap-4 p-6', plan.id === 'PRO' && 'border-amber-400/40 shadow-glow-coral')}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-xl font-semibold">
                        {plan.id === 'PRO' && '⭐ '}
                        {plan.nombre}
                      </h2>
                      {esActual && <span className="chip text-xs">Tu plan</span>}
                    </div>
                    <ul className="flex flex-1 flex-col gap-2 text-sm text-paper-muted">
                      {plan.beneficios.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="text-emerald-400" aria-hidden>
                            ✓
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                    {plan.id === 'PRO' && !premium && (
                      <Button onClick={pasarAPremium} cargando={pagando}>
                        Pasar a Premium
                      </Button>
                    )}
                    {plan.id === 'PRO' && <p className="text-[11px] text-paper-dim">Cada pago activa Premium por 30 días.</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </FondoEstudio>
  );
}
