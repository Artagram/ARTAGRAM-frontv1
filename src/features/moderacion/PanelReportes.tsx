import { useEffect, useState } from 'react';
import { extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  cargarReportes,
  procesarObrasSinMarca,
  resolverReporte,
  resumirMotivos,
  type AccionModeracion,
  type ReporteAgrupado,
} from './reportesApi';

export function PanelReportes() {
  const [reportes, setReportes] = useState<ReporteAgrupado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [resolviendo, setResolviendo] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarReportes()
      .then(setReportes)
      .catch((err) => setError(extraerMensajeError(err, 'No pudimos cargar los reportes')))
      .finally(() => setCargando(false));
  }, []);

  async function resolver(publicacionId: string, accion: AccionModeracion) {
    setResolviendo(publicacionId);
    setError(null);
    try {
      await resolverReporte(publicacionId, accion);
      setReportes((prev) => prev.filter((r) => r.publicacionId !== publicacionId));
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos resolver el reporte'));
    } finally {
      setResolviendo(null);
    }
  }

  async function procesarMarcas() {
    setProcesando(true);
    setError(null);
    setAviso(null);
    try {
      const enviadas = await procesarObrasSinMarca();
      setAviso(enviadas === 0 ? 'Todas las obras ya tienen marca de agua.' : `${enviadas} obras enviadas a marcar.`);
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos procesar las obras'));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) return <Skeleton filas={3} claseFila="h-32" />;

  return (
    <div>
      {error && <p className="banner-error mb-4">{error}</p>}

      {reportes.length === 0 ? (
        <p className="py-10 text-center text-paper-muted">No hay reportes pendientes.</p>
      ) : (
        <div className="space-y-3">
          {reportes.map((r) => (
            <div key={r.publicacionId} className="card card-fija flex flex-col gap-4 p-3.5 sm:flex-row">
              <img src={r.imagenUrl} alt={r.titulo} className="h-24 w-24 flex-shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{r.titulo}</h3>
                  {r.oculta && <span className="chip text-xs">Oculta</span>}
                </div>
                <p className="text-xs text-paper-dim">
                  {r.autorNombre} · {r.total} {r.total === 1 ? 'reporte' : 'reportes'} ·{' '}
                  {new Date(r.ultimoEn).toLocaleDateString('es')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resumirMotivos(r.motivos)
                    .split(' · ')
                    .map((motivo) => (
                      <span key={motivo} className="chip">
                        {motivo}
                      </span>
                    ))}
                </div>
                {r.detalles.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-paper-muted">
                    {r.detalles.map((d, i) => (
                      <li key={i} className="break-words">
                        “{d}”
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-shrink-0 items-start gap-2">
                <Button
                  variant="secondary"
                  className="border-teal/60 text-teal hover:border-teal"
                  disabled={resolviendo !== null}
                  onClick={() => resolver(r.publicacionId, 'RESTAURAR')}
                >
                  {r.oculta ? 'Restaurar' : 'Descartar'}
                </Button>
                <Button disabled={resolviendo !== null} onClick={() => resolver(r.publicacionId, 'OCULTAR')}>
                  {r.oculta ? 'Mantener oculta' : 'Ocultar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-paper/10 pt-6">
        <p className="label">Marca de agua</p>
        <p className="mt-1 text-sm text-paper-muted">Envía a marcar las obras publicadas antes de esta función.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={procesarMarcas} cargando={procesando}>
            Procesar obras sin marca
          </Button>
          {aviso && <span className="text-sm text-paper-muted">{aviso}</span>}
        </div>
      </div>
    </div>
  );
}
