import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { useAuthStore } from '../../lib/authStore';
import { FondoEstudio } from '../../components/layout/FondoEstudio';
import { BotonPro } from '../suscripcion/BotonPro';
import { TablaPlanes } from '../suscripcion/TablaPlanes';
import { cargarSuscripcion, type Suscripcion } from '../suscripcion/suscripcionApi';

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
  const premiumEnSesion = useAuthStore((s) => s.sesion?.premium ?? false);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);

  // Si el servicio de pagos no responde, la página sigue mostrando el plan de la sesión.
  useEffect(() => {
    cargarSuscripcion().then(setSuscripcion).catch(() => undefined);
  }, []);

  const premium = (suscripcion?.premium ?? false) || premiumEnSesion;

  return (
    <FondoEstudio>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">Tu plan</h1>
          <p className="text-sm text-paper-muted">Pásate a PRO para crear sin límites con tu comunidad.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card mb-6 flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-paper-muted">Plan actual:</span>
              {premium ? (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  ⭐ PRO
                </span>
              ) : (
                <span className="chip text-xs">Gratis</span>
              )}
            </div>
            {premium && suscripcion?.fechaFin && (
              <span className="text-xs text-paper-dim">
                Activo hasta el {format(new Date(suscripcion.fechaFin), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            )}
          </div>
          {suscripcion && (
            <div className="grid gap-4 sm:grid-cols-2">
              <BarraUso etiqueta="Almacenamiento" usado={suscripcion.megabytesUsados} maximo={suscripcion.maxMegabytes} unidad="MB" />
              <BarraUso etiqueta="Obras" usado={suscripcion.obrasSubidas} maximo={suscripcion.maxObras} unidad="" />
            </div>
          )}
        </motion.div>

        <div className="card p-5">
          <TablaPlanes />
          {!premium && (
            <div className="mt-5">
              <BotonPro />
            </div>
          )}
        </div>
      </div>
    </FondoEstudio>
  );
}
