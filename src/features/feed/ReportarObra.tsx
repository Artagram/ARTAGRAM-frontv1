import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { MOTIVOS_REPORTE } from '../../lib/reportes';
import type { MotivoReporte } from '../../types';

/** Formulario para reportar una obra (POST /api/publicaciones/{id}/reportes, ver contrato). */
export function ReportarObra({ publicacionId, onCerrar }: { publicacionId: string; onCerrar: () => void }) {
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const faltaDetalle = motivo === 'OTRO' && !detalle.trim();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo || faltaDetalle) return;
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/api/publicaciones/${publicacionId}/reportes`, { motivo, detalle: detalle.trim() || null });
      setEnviado(true);
    } catch (err) {
      // Un reporte repetido no es un error para quien reporta: ya está en revisión
      if (axios.isAxiosError(err) && err.response?.data?.code === 'REPORTE_DUPLICADO') setEnviado(true);
      else setError(extraerMensajeError(err, 'No se pudo enviar el reporte'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-b border-coral/30 bg-ink-900/90"
    >
      {enviado ? (
        <div className="flex items-center justify-between gap-3 p-5">
          <p className="text-sm text-paper-muted">Gracias. Un administrador revisará esta obra.</p>
          <button type="button" onClick={onCerrar} className="text-xs text-violet hover:underline">
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-3 p-5">
          <h4 className="text-sm font-semibold text-paper">¿Por qué reportas esta obra?</h4>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Motivo del reporte">
            {MOTIVOS_REPORTE.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm text-paper-muted">
                <input
                  type="radio"
                  name={`motivo-${publicacionId}`}
                  value={m.id}
                  checked={motivo === m.id}
                  onChange={() => setMotivo(m.id)}
                  className="accent-coral"
                />
                {m.texto}
              </label>
            ))}
          </div>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={motivo === 'OTRO' ? 'Cuéntanos qué pasa (obligatorio)' : 'Detalles (opcional)'}
            className="input resize-none text-sm"
          />
          {error && <p className="text-xs text-coral-light">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" cargando={enviando} disabled={!motivo || faltaDetalle}>
              Enviar reporte
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
