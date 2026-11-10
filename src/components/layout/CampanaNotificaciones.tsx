import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import {
  cargarNotificaciones,
  contadorVisible,
  marcarTodasLeidas,
  type Notificacion,
} from '../../features/notifications/notificacionesApi';
import { useNotificacionesStore } from '../../features/notifications/notificacionesStore';
import { useAbrirNotificacion } from '../../features/notifications/useAbrirNotificacion';

const ICONOS: Record<string, string> = {
  NUEVO_SEGUIDOR: '👤',
  NUEVO_LIKE: '❤️',
  NUEVO_COMENTARIO: '💬',
  SUSCRIPCION_PREMIUM: '⭐',
  SUSCRIPCION_VENCIDA: '⏳',
  ANALISIS_IA_LISTO: '🎨',
  OBRA_MODERADA: '🛡️',
};

export function CampanaNotificaciones() {
  const lista = useNotificacionesStore((s) => s.lista);
  const noLeidas = useNotificacionesStore((s) => s.noLeidas);
  const abrirNotificacion = useAbrirNotificacion();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    cargarNotificaciones()
      .then((notificaciones) => {
        useNotificacionesStore.getState().fijarLista(notificaciones);
        setError(false);
      })
      .catch(() => setError(true));

    const alClic = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  function abrir(n: Notificacion) {
    setAbierto(false);
    abrirNotificacion(n);
  }

  function marcarTodas() {
    marcarTodasLeidas()
      .then(useNotificacionesStore.getState().marcarTodas)
      .catch(() => setError(true));
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        title="Notificaciones"
        aria-label={noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'}
        aria-expanded={abierto}
        className={clsx(
          'relative grid h-11 w-11 place-items-center rounded-[10px] hover:bg-paper/10 hover:text-paper md:h-[30px] md:w-[30px]',
          abierto ? 'bg-paper/10 text-paper' : 'text-paper-muted',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9Z" />
          <path d="M10 20a2.2 2.2 0 0 0 4 0" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-semibold text-ink-800">
            {contadorVisible(noLeidas)}
          </span>
        )}
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            // En móvil la campana no está en el borde: el panel se fija a los lados de la pantalla.
            className="card card-fija fixed inset-x-4 top-[var(--alto-barra)] z-50 flex max-h-[70vh] flex-col overflow-hidden p-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[360px]"
            role="dialog"
            aria-label="Notificaciones"
          >
            <div className="flex items-center justify-between border-b border-paper/10 px-4 py-3">
              <h2 className="text-base font-semibold">Notificaciones</h2>
              {noLeidas > 0 && (
                <button type="button" onClick={marcarTodas} className="text-xs text-teal hover:underline">
                  Marcar como leídas
                </button>
              )}
            </div>

            {error && <p className="px-4 pt-3 text-xs text-coral-light">No pudimos actualizar tus notificaciones.</p>}

            {lista.length === 0 ? (
              !error && <p className="px-4 py-10 text-center text-sm text-paper-muted">Aún no tienes notificaciones.</p>
            ) : (
              <ul className="overflow-y-auto">
                {lista.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => abrir(n)}
                      className={clsx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-paper/10',
                        !n.leida && 'bg-paper/5',
                      )}
                    >
                      <span className="mt-0.5 text-base" aria-hidden>
                        {ICONOS[n.tipo] ?? '🔔'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block break-words text-sm', n.leida ? 'text-paper-muted' : 'text-paper')}>{n.mensaje}</span>
                        <span className="block text-[11px] text-paper-dim">
                          {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
                        </span>
                      </span>
                      {!n.leida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="Sin leer" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Link
              to="/notificaciones"
              onClick={() => setAbierto(false)}
              className="border-t border-paper/10 px-4 py-2.5 text-center text-xs text-teal hover:underline"
            >
              Ver todas →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
