import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { api, extraerMensajeError } from '../../lib/api';
import { MOTIVOS_REPORTE } from '../../lib/reportes';
import type { ReporteDto } from '../../types';

const TEXTO_MOTIVO = Object.fromEntries(MOTIVOS_REPORTE.map((m) => [m.id, m.texto]));

/** Cola de moderación: reportes pendientes (GET/PATCH /api/reportes, ver contrato). */
export function ReportesPanel() {
  const [reportes, setReportes] = useState<ReporteDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ReporteDto[]>('/api/reportes', { params: { estado: 'PENDIENTE' } })
      .then((r) => setReportes(r.data))
      .catch((err) => setError(extraerMensajeError(err, 'No se pudieron cargar los reportes')))
      .finally(() => setCargando(false));
  }, []);

  async function resolver(reporte: ReporteDto, estado: 'ACEPTADO' | 'DESCARTADO') {
    setResolviendo(reporte.id);
    setError(null);
    try {
      await api.patch(`/api/reportes/${reporte.id}`, { estado });
      // Aceptar borra la obra: se van también los demás reportes pendientes de esa misma obra
      setReportes((prev) =>
        prev.filter((r) => r.id !== reporte.id && !(estado === 'ACEPTADO' && r.publicacionId === reporte.publicacionId)),
      );
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo resolver el reporte'));
    } finally {
      setResolviendo(null);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="titulo-reportes">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="titulo-reportes" className="font-display text-xl font-semibold">
          Obras reportadas
        </h2>
        {!cargando && <span className="text-sm text-paper-dim">{reportes.length} pendientes</span>}
      </div>

      {error && <p className="mb-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}

      {cargando ? (
        <p className="text-sm text-paper-muted">Cargando reportes…</p>
      ) : reportes.length === 0 ? (
        !error && <p className="card p-6 text-center text-sm text-paper-muted">No hay reportes pendientes. ✨</p>
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {reportes.map((r) => (
              <motion.li
                key={r.id}
                layout
                exit={{ opacity: 0, height: 0 }}
                className="card flex flex-col gap-4 overflow-hidden p-4 sm:flex-row"
              >
                <img src={r.obraUrl} alt={r.publicacionTitulo} className="h-24 w-24 shrink-0 rounded-lg bg-ink-800 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {r.publicacionTitulo} <span className="text-sm text-paper-dim">de {r.autorNombre}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="chip text-xs">{TEXTO_MOTIVO[r.motivo] ?? r.motivo}</span>
                  </p>
                  {r.detalle && <p className="mt-2 text-sm text-paper-muted">“{r.detalle}”</p>}
                  <p className="mt-2 text-[11px] text-paper-dim">
                    Reportado por {r.reportanteNombre} · {formatDistanceToNow(new Date(r.creadoEn), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button
                    type="button"
                    disabled={resolviendo === r.id}
                    onClick={() => void resolver(r, 'ACEPTADO')}
                    className="rounded-lg bg-coral px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-coral-dark disabled:opacity-60"
                  >
                    Eliminar obra
                  </button>
                  <button
                    type="button"
                    disabled={resolviendo === r.id}
                    onClick={() => void resolver(r, 'DESCARTADO')}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-paper-muted hover:bg-ink-800 disabled:opacity-60"
                  >
                    Descartar
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
