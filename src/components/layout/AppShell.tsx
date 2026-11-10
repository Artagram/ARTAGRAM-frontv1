import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../lib/authStore';
import { Button } from '../ui/Button';
import { AvisoPlanLimite } from '../../features/suscripcion/AvisoPlanLimite';
import { CampanaNotificaciones } from './CampanaNotificaciones';
import { contadorVisible } from '../../features/notifications/notificacionesApi';
import { useNotificacionesStore } from '../../features/notifications/notificacionesStore';
import { useNotificacionesEnVivo } from '../../features/notifications/useNotificacionesEnVivo';

const enlaces = [
  { a: '/feed', texto: 'Feed' },
  { a: '/comunidades', texto: 'Comunidades' },
  { a: '/fiesta', texto: 'Modo fiesta' },
];

function BotonNav({ a, titulo, cantidad, children }: { a: string; titulo: string; cantidad: number; children: ReactNode }) {
  return (
    <Link
      to={a}
      title={titulo}
      aria-label={cantidad > 0 ? `${titulo}: ${cantidad} sin leer` : titulo}
      className="relative grid h-9 w-9 place-items-center rounded-lg text-paper-muted hover:bg-ink-800 hover:text-paper"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        {children}
      </svg>
      {cantidad > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-semibold text-ink-950">
          {contadorVisible(cantidad)}
        </span>
      )}
    </Link>
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
      <AvisoPlanLimite />
      <header className="sticky top-0 z-40 border-b border-paper/10 bg-ink-950/35 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/feed" className="flex items-center gap-2 group">
            <motion.img
              src="/favicon.svg"
              alt="Artagram"
              className="h-8 w-8"
              whileHover={{ scale: 1.1, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            />
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">Artagram</span>
          </Link>

          {sesion && (
            <nav className="hidden items-center gap-1 md:flex">
              {enlacesVisibles.map((e) => {
                const activo = location.pathname === e.a || location.pathname.startsWith(e.a + '/');
                return (
                  <Link
                    key={e.a}
                    to={e.a}
                    className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activo ? 'text-paper' : 'text-paper-muted hover:text-paper'
                    }`}
                  >
                    {activo && (
                      <motion.span
                        layoutId="nav-activo"
                        className="absolute inset-0 rounded-lg bg-ink-800"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative">{e.texto}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {sesion ? (
              <>
                <div className="flex items-center gap-1">
                  <BotonNav a="/mensajes" titulo="Mensajes" cantidad={mensajes}>
                    <path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-4.6A8 8 0 1 1 21 12Z" />
                  </BotonNav>
                  <CampanaNotificaciones />
                </div>
                <Link
                  to={`/perfil/${sesion.nombreArtista}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-paper-muted hover:bg-ink-800 hover:text-paper"
                >
                  <span
                    className={`relative grid h-7 w-7 place-items-center rounded-full bg-ink-700 text-xs font-semibold uppercase ${
                      sesion.premium ? 'ring-2 ring-amber-400/70' : ''
                    }`}
                  >
                    {sesion.nombreArtista.slice(0, 2)}
                    {sesion.premium && (
                      <span className="absolute -bottom-1 -right-1 text-[10px]" aria-hidden>
                        ⭐
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:inline">{sesion.nombreArtista}</span>
                  {sesion.premium && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 text-[10px] font-semibold text-amber-300">
                      PRO
                    </span>
                  )}
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => {
                    cerrarSesion();
                    navigate('/login');
                  }}
                >
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-primary">
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
        {sesion && (
          <nav className="flex gap-1 overflow-x-auto border-t border-ink-800 px-2 py-1.5 md:hidden">
            {enlacesConPlanes.map((e) => (
              <Link key={e.a} to={e.a} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-paper-muted hover:bg-ink-800">
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
