import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import type { ComunidadResponse } from '../../types';
import { ComunidadChatPanel } from '../chat/ComunidadChatPanel';
import { CommunityBannerMural } from './CommunityBannerMural';
import { CommunityAdminPanel } from './CommunityAdminPanel';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

export function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sesion = useAuthStore((s) => s.sesion);

  const [comunidad, setComunidad] = useState<ComunidadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pintandoBanner, setPintandoBanner] = useState(false);
  const [mostrarPanelAdmin, setMostrarPanelAdmin] = useState(false);

  useEffect(() => {
    cargarComunidad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function cargarComunidad() {
    if (!id) return;
    api
      .get<ComunidadResponse>(`/api/comunidades/${id}`)
      .then((r) => setComunidad(r.data))
      .catch((err) => setError(extraerMensajeError(err)));
  }

  function copiarId() {
    if (!comunidad) return;
    navigator.clipboard.writeText(comunidad.id);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (error) {
    return <p className="banner-error mx-auto my-16 max-w-xl text-center">{error}</p>;
  }
  if (!comunidad || !id) {
    return <Skeleton filas={2} className="mx-auto max-w-6xl px-4 py-6" claseFila="h-56" />;
  }

  const esAdmin =
    comunidad.miRol === 'ADMIN' ||
    comunidad.miRol === 'MODERADOR' ||
    sesion?.rolGlobal === 'ADMIN' ||
    comunidad.creador === sesion?.nombreArtista;
  const esCreador = comunidad.creador === sesion?.nombreArtista;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* HEADER DE LA COMUNIDAD CON EL MURAL BANNER PERMANENTE EN EL FONDO */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-paper/10 bg-ink-800">
        {/* Mural en el fondo de la cabecera */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <CommunityBannerMural comunidadId={id} interactivo={false} alturaPx={280} />
          {/* Degradado artístico suave para legibilidad de textos */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-800 via-ink-800/75 to-ink-800/25 pointer-events-none" />
        </div>

        {/* Contenido sobre el banner */}
        <div className="relative z-10 p-6 md:p-8 flex flex-col justify-between gap-6 min-h-[220px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{comunidad.publica ? 'Pública' : 'Privada'}</span>
              <span className="chip">Tu rol: {comunidad.miRol ?? 'Visitante'}</span>
            </div>

            {/* Acciones principales */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setPintandoBanner((v) => !v)}
                className="px-3 py-1.5 text-xs"
              >
                {pintandoBanner ? 'Ocultar pintor' : '🎨 Pintar en el mural'}
              </Button>

              {esAdmin && (
                <Button
                  variant={mostrarPanelAdmin ? 'primary' : 'secondary'}
                  onClick={() => setMostrarPanelAdmin((v) => !v)}
                  className="px-3 py-1.5 text-xs"
                >
                  🛡️ {mostrarPanelAdmin ? 'Cerrar panel' : 'Panel de Control'}
                </Button>
              )}
            </div>
          </div>

          <div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-paper">
              {comunidad.nombre}
            </h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-paper-muted drop-shadow-sm">
              {comunidad.descripcion || 'Sin descripción'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-paper-muted">
              <span>Creada por <strong className="text-paper">@{comunidad.creador}</strong></span>
              <span>·</span>
              <span><strong className="text-paper">{comunidad.totalMiembros}</strong> miembros</span>
              <span>·</span>

              {/* ID DE LA COMUNIDAD CLARAMENTE VISIBLE Y COPIABLE */}
              <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1 font-mono">
                <span className="text-paper-dim">ID:</span>
                <span className="text-paper font-semibold select-all">{comunidad.id}</span>
                <button
                  type="button"
                  onClick={copiarId}
                  className="ml-1 font-sans text-[11px] text-teal transition-colors hover:text-paper"
                  title="Copiar ID de la comunidad"
                >
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MURAL INTERACTIVO EXPANDIBLE ESTILO MODO FIESTA */}
      {pintandoBanner && (
        <div className="card card-fija borde-fiesta mb-6 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-coral">Lienzo Mural de la Comunidad</h2>
                <span className="chip">Permanente</span>
              </div>
              <p className="text-xs text-paper-muted">
                Dibuja con la barra completa de herramientas o el borrador. Tus trazos quedan grabados en tiempo real y decoran el fondo de la comunidad.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/comunidades/${id}/banner`}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Abrir en pantalla completa ↗
              </Link>
              <button
                type="button"
                onClick={() => setPintandoBanner(false)}
                className="text-paper-muted hover:text-coral transition-colors text-sm px-2 py-1"
                title="Cerrar pintor"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
          <CommunityBannerMural
            comunidadId={id}
            interactivo={true}
            alturaPx={520}
            onCerrarEdicion={() => setPintandoBanner(false)}
          />
        </div>
      )}

      {/* PANEL DE CONTROL DE ADMINISTRADOR */}
      {mostrarPanelAdmin && esAdmin && (
        <div className="mb-6">
          <CommunityAdminPanel
            comunidad={comunidad}
            esAdmin={esAdmin}
            esCreador={esCreador}
            onMiembrosActualizados={cargarComunidad}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Link to={`/comunidades/${id}/lienzo`} className="card borde-comunidad group flex-1 p-5">
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-teal">
              <span className="punto-vivo" aria-hidden />
              En vivo
            </p>
            <h2 className="font-display text-xl font-semibold group-hover:underline">Entrar al lienzo en vivo →</h2>
            <p className="mt-2 max-w-md text-sm text-paper-muted">
              Dibuja en tiempo real con quien esté conectado. Cursores con nombres y actualización continua de trazos.
            </p>
          </Link>

          <Link to={`/comunidades/${id}/banner`} className="card borde-proceso group flex-1 p-5">
            <h2 className="font-display text-xl font-semibold group-hover:underline">Pintor de mural permanente →</h2>
            <p className="mt-2 text-sm text-paper-muted">
              Accede al lienzo permanente de <span className="font-mono">1000×1000</span> píxeles que da vida al fondo de tu comunidad.
            </p>
          </Link>
        </div>

        <ComunidadChatPanel comunidadId={id} />
      </div>
    </div>
  );
}
