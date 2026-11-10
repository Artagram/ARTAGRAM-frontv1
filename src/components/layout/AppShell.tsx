import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuthStore } from '../../lib/authStore';
import { useCerrarAlExterior } from '../ui/useCerrarAlExterior';
import { AvisoPlanLimite } from '../../features/suscripcion/AvisoPlanLimite';
import { CampanaNotificaciones } from './CampanaNotificaciones';
import { FondoVivo } from './FondoVivo';
import { contadorVisible } from '../../features/notifications/notificacionesApi';
import { useNotificacionesStore } from '../../features/notifications/notificacionesStore';
import { useNotificacionesEnVivo } from '../../features/notifications/useNotificacionesEnVivo';

const enlaces = [
  { a: '/feed', texto: 'Feed' },
  { a: '/comunidades', texto: 'Comunidades' },
  { a: '/fiesta', texto: 'Fiesta' },
];

function esActivo(ruta: string, enlace: string) {
  return ruta === enlace || ruta.startsWith(enlace + '/');
}

function BotonNav({ a, titulo, cantidad, children }: { a: string; titulo: string; cantidad: number; children: ReactNode }) {
  return (
    <Link
      to={a}
      title={titulo}
      aria-label={cantidad > 0 ? `${titulo}: ${cantidad} sin leer` : titulo}
      className="relative grid h-11 w-11 place-items-center rounded-[10px] text-paper-muted hover:bg-paper/10 hover:text-paper md:h-[30px] md:w-[30px]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        {children}
      </svg>
      {cantidad > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-teal px-1 text-[10px] font-semibold text-ink-800">
          {contadorVisible(cantidad)}
        </span>
      )}
    </Link>
  );
}

function MenuAvatar({ nombreArtista, premium, onSalir }: { nombreArtista: string; premium?: boolean; onSalir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const cerrar = useCallback(() => setAbierto(false), []);
  useCerrarAlExterior(contenedorRef, abierto, cerrar);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label={`Menú de ${nombreArtista}${premium ? ', plan PRO' : ''}`}
        className="grid h-11 w-11 place-items-center rounded-full md:h-9 md:w-9"
      >
        <span
          className={clsx(
            'grid h-8 w-8 place-items-center rounded-full bg-ink-600 text-xs font-semibold uppercase',
            premium && 'shadow-[0_0_0_2px_#1B1626,0_0_0_4px_#FFC24B]',
          )}
        >
          {nombreArtista.slice(0, 2)}
        </span>
      </button>
      {abierto && (
        <div className="panel-flotante absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden py-1">
          <Link
            to={`/perfil/${nombreArtista}`}
            onClick={cerrar}
            className="block truncate px-4 py-2.5 text-sm text-paper hover:bg-paper/10"
          >
            {nombreArtista}
            {premium && <span className="insignia-pro ml-2">PRO</span>}
          </Link>
          <button
            type="button"
            onClick={onSalir}
            className="block w-full px-4 py-2.5 text-left text-sm text-paper-muted hover:bg-paper/10 hover:text-paper"
          >
            Salir
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const sesion = useAuthStore((s) => s.sesion);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const navigate = useNavigate();
  const location = useLocation();
  const mensajes = useNotificacionesStore((s) => s.mensajes);
  useNotificacionesEnVivo();
  const enlacesConPlanes = [...enlaces, { a: '/planes', texto: sesion?.premium ? 'Mi plan' : 'Planes' }];
  const enlacesVisibles =
    sesion?.rolGlobal === 'ADMIN' ? [...enlacesConPlanes, { a: '/admin', texto: 'Admin' }] : enlacesConPlanes;

  return (
    <div className="min-h-screen flex flex-col">
      <FondoVivo />
      <AvisoPlanLimite />
      <header className="barra-vidrio sticky top-[18px] z-40 mx-[18px] mt-[18px]">
        <div className="flex items-center justify-between gap-3 px-4 py-1.5 md:py-2.5">
          <Link to="/feed" className="font-display text-xl font-medium italic tracking-tight">
            artagram<span className="text-coral">.</span>
          </Link>

          {sesion && (
            <nav className="hidden items-center gap-1 md:flex">
              {enlacesVisibles.map((e) => {
                const activo = esActivo(location.pathname, e.a);
                return (
                  <Link
                    key={e.a}
                    to={e.a}
                    aria-current={activo ? 'page' : undefined}
                    className={clsx(
                      'relative px-3 py-1.5 text-sm font-medium transition-colors',
                      activo ? 'text-paper' : 'text-paper-muted hover:text-paper',
                    )}
                  >
                    {e.texto}
                    {activo && (
                      <motion.span
                        layoutId="nav-activo"
                        className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-coral"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-1 md:gap-2">
            {sesion ? (
              <>
                <BotonNav a="/mensajes" titulo="Mensajes" cantidad={mensajes}>
                  <path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-4.6A8 8 0 1 1 21 12Z" />
                </BotonNav>
                <CampanaNotificaciones />
                <MenuAvatar
                  nombreArtista={sesion.nombreArtista}
                  premium={sesion.premium}
                  onSalir={() => {
                    cerrarSesion();
                    navigate('/login');
                  }}
                />
              </>
            ) : (
              <Link to="/login" className="btn-primary">
                Entrar
              </Link>
            )}
          </div>
        </div>
        {sesion && (
          <nav className="mx-2 mb-2 flex gap-1 rounded-full bg-paper/10 p-1 md:hidden">
            {enlacesConPlanes.map((e) => (
              <Link
                key={e.a}
                to={e.a}
                aria-current={esActivo(location.pathname, e.a) ? 'page' : undefined}
                className={clsx('tab px-1 py-2.5 text-xs', esActivo(location.pathname, e.a) && 'tab-activa')}
              >
                {e.texto}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
