import { useState } from 'react';
import { extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { MOTIVOS, reportarObra, type MotivoReporte } from './reportesApi';

interface ModalReportarProps {
  publicacionId: string;
  onCerrar: () => void;
  onReportada: () => void;
}

export function ModalReportar({ publicacionId, onCerrar, onReportada }: ModalReportarProps) {
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo) return;
    setEnviando(true);
    setError(null);
    try {
      await reportarObra(publicacionId, motivo, detalle);
      onReportada();
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos enviar el reporte'));
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/70 p-4" onClick={onCerrar}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reportar-titulo"
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={enviar}
      >
        <h2 id="reportar-titulo" className="font-display text-xl font-semibold">
          Reportar obra
        </h2>
        <p className="mt-1 text-sm text-paper-muted">Un administrador revisará tu reporte.</p>

        <div className="mt-4 space-y-2">
          {(Object.entries(MOTIVOS) as [MotivoReporte, string][]).map(([valor, etiqueta]) => (
            <label key={valor} className="flex items-center gap-2 text-sm text-paper">
              <input type="radio" name="motivo" checked={motivo === valor} onChange={() => setMotivo(valor)} />
              {etiqueta}
            </label>
          ))}
        </div>

        <label className="mt-4 block text-xs text-paper-dim">
          Detalle (opcional)
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-paper/10 bg-ink-800 px-3 py-1.5 text-sm text-paper focus:border-violet focus:outline-none"
          />
        </label>

        {error && <p className="mt-2 text-xs text-coral-light">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!motivo} cargando={enviando}>
            Enviar reporte
          </Button>
        </div>
      </form>
    </div>
  );
}
