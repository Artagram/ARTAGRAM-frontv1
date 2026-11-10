import { Skeleton } from '../../components/ui/Skeleton';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { PanelReportes } from '../moderacion/PanelReportes';
import type { KpiDetalle as KpiDetalleDto } from '../../types';

interface DashboardInfo {
  panelTecnicoUrl: string;
  panelNegocioUrl: string;
  prometheusUrl: string;
}

type Pestana = 'negocio' | 'reportes';

const PESTANAS: { id: Pestana; titulo: string }[] = [
  { id: 'negocio', titulo: 'Negocio' },
  { id: 'reportes', titulo: 'Reportes' },
];

const TENDENCIA_ICONO: Record<string, string> = { SUBE: '↑', BAJA: '↓', IGUAL: '→' };
const TENDENCIA_COLOR: Record<string, string> = { SUBE: 'text-teal', BAJA: 'text-coral', IGUAL: 'text-paper-dim' };

export function AdminDashboardPage() {
  const [kpis, setKpis] = useState<KpiDetalleDto[]>([]);
  const [info, setInfo] = useState<DashboardInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>('negocio');

  useEffect(() => {
    Promise.all([api.get<KpiDetalleDto[]>('/api/admin/kpis'), api.get<DashboardInfo>('/api/admin/dashboard')])
      .then(([kpisRes, infoRes]) => {
        setKpis(kpisRes.data);
        setInfo(infoRes.data);
      })
      .catch((err) => setError(extraerMensajeError(err, 'No tienes acceso a este panel')))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <Skeleton filas={2} className="mx-auto max-w-6xl px-4 py-10" claseFila="h-40" />;
  if (error) return <p className="banner-error mx-auto my-16 max-w-xl text-center">{error}</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <p className="label">Solo administradores</p>
        <h1 className="font-display text-[32px] font-semibold leading-tight">{pestana === 'negocio' ? 'Panel de negocio' : 'Reportes de obras'}</h1>
        <p className="mt-1 text-paper-muted">
          {pestana === 'negocio'
            ? 'Los 4 KPIs de negocio, calculados en vivo, con su fórmula y periodo.'
            : 'Obras reportadas por la comunidad, agrupadas y pendientes de revisión.'}
        </p>
      </div>

      <div role="tablist" className="tabs mb-6">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`tab ${pestana === p.id ? 'tab-activa' : ''}`}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {pestana === 'reportes' ? <PanelReportes /> : <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card card-fija p-3.5"
          >
            <p className="label">{k.nombre}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[32px] font-semibold leading-none">{k.valorActual.toLocaleString('es')}</span>
              <span className={`text-sm font-medium ${TENDENCIA_COLOR[k.tendencia]}`}>{TENDENCIA_ICONO[k.tendencia]}</span>
            </div>
            <p className="mt-1 text-xs text-paper-dim">Meta: {k.meta.toLocaleString('es')}</p>
            <p className="mt-3 text-xs text-paper-muted">{k.formula}</p>
            <p className="mt-2 text-[11px] text-paper-dim">
              {new Date(k.periodoDesde).toLocaleDateString('es')} – {new Date(k.periodoHasta).toLocaleDateString('es')} ·{' '}
              {k.cantidadEventosContados} eventos
            </p>
          </motion.div>
        ))}
      </div>

      {info && (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <PanelEnlace titulo="Panel técnico" descripcion="Latencia de trazos, sesiones activas, bloqueos negados…" url={info.panelTecnicoUrl} color="text-teal" />
          <PanelEnlace titulo="Panel de negocio" descripcion="Registros, sesiones colaborativas, retención…" url={info.panelNegocioUrl} color="text-violet" />
          <PanelEnlace titulo="Prometheus" descripcion="Métricas crudas expuestas por el backend." url={info.prometheusUrl} color="text-amber" />
        </div>
      )}
      </>}
    </div>
  );
}

function PanelEnlace({ titulo, descripcion, url, color }: { titulo: string; descripcion: string; url: string; color: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="card group p-3.5">
      <h3 className={`font-display text-lg font-semibold ${color}`}>{titulo} ↗</h3>
      <p className="mt-1 text-sm text-paper-muted">{descripcion}</p>
    </a>
  );
}
