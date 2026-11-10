import { useState } from 'react';
import { extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
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
    <Modal etiquetadoPor="reportar-titulo" onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <h2 id="reportar-titulo" className="font-display text-xl font-semibold">
          Reportar obra
        </h2>
        <p className="mt-1 text-sm text-paper-muted">Un administrador revisará tu reporte.</p>

        <div role="radiogroup" aria-label="Motivo del reporte" className="mt-4 flex flex-wrap gap-2">
          {(Object.entries(MOTIVOS) as [MotivoReporte, string][]).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={motivo === valor}
              onClick={() => setMotivo(valor)}
              className={`chip px-3 py-2 text-sm ${motivo === valor ? 'chip-activo' : 'hover:text-paper'}`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <label className="label mt-4 block">
          Detalle (opcional)
          <textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} rows={3} maxLength={500} className="input mt-1 font-normal" />
        </label>

        {error && <p className="banner-error mt-3">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!motivo} cargando={enviando}>
            Enviar reporte
          </Button>
        </div>
      </form>
    </Modal>
  );
}
