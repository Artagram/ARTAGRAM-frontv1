import { Link, useParams } from 'react-router-dom';
import { CommunityBannerMural } from '../community/CommunityBannerMural';

export function BannerMuralPage() {
  const { id: comunidadId } = useParams<{ id: string }>();

  if (!comunidadId) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-paper-dim">Mural Comunitario Permanente · 1000×1000</p>
          <h1 className="font-display text-[32px] font-semibold leading-tight">
            Lienzo Mural de la <span className="acento text-teal">Comunidad</span>
          </h1>
          <p className="text-xs text-paper-muted">
            Dibuja con la barra de herramientas completa del modo fiesta. Tus trazos quedan grabados permanentemente y decoran el fondo de la comunidad.
          </p>
        </div>
        <Link to={`/comunidades/${comunidadId}`} className="btn-ghost text-xs">
          ← Volver a la comunidad
        </Link>
      </div>

      <div className="card card-fija overflow-hidden p-3.5">
        <CommunityBannerMural comunidadId={comunidadId} interactivo={true} alturaPx={620} />
      </div>
    </div>
  );
}
