import { useAuthStore } from '../../lib/authStore';
import { usePlanLimiteStore } from '../../lib/planLimiteStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { BotonPro } from './BotonPro';
import { TablaPlanes } from './TablaPlanes';

export function AvisoPlanLimite() {
  const mensaje = usePlanLimiteStore((s) => s.mensaje);
  const cerrar = usePlanLimiteStore((s) => s.cerrar);
  const premium = useAuthStore((s) => s.sesion?.premium);

  if (!mensaje) return null;

  return (
    <Modal etiquetadoPor="aviso-plan-titulo" onCerrar={cerrar}>
      <h2 id="aviso-plan-titulo" className="font-display text-[32px] font-semibold leading-tight">
        Llegaste al <span className="acento">límite</span>
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
    </Modal>
  );
}
