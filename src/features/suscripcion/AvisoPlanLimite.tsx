import { useAuthStore } from '../../lib/authStore';
import { usePlanLimiteStore } from '../../lib/planLimiteStore';
import { Button } from '../../components/ui/Button';
import { BotonPro } from './BotonPro';
import { TablaPlanes } from './TablaPlanes';

export function AvisoPlanLimite() {
  const mensaje = usePlanLimiteStore((s) => s.mensaje);
  const cerrar = usePlanLimiteStore((s) => s.cerrar);
  const premium = useAuthStore((s) => s.sesion?.premium);

  if (!mensaje) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/70 p-4" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-plan-titulo"
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="aviso-plan-titulo" className="font-display text-xl font-semibold">
          Llegaste al límite de tu plan
        </h2>
        <p className="mt-2 text-sm text-paper-muted">{mensaje}</p>
        <div className="mt-4">
          <TablaPlanes />
        </div>
        <div className="mt-5 flex items-start justify-end gap-2">
          <Button variant="ghost" onClick={cerrar}>
            Ahora no
          </Button>
          {!premium && <BotonPro />}
        </div>
      </div>
    </div>
  );
}
