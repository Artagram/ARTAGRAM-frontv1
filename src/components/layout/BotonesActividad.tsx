import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { useNotificacionesStore } from '../../lib/notificacionesStore';
import type { ArtistaResumen, NotificacionDto } from '../../types';

const ICONOS: Record<string, string> = {
  NUEVO_SEGUIDOR: '👤',
  NUEVO_LIKE: '❤️',
  NUEVO_COMENTARIO: '💬',
  SUSCRIPCION_PREMIUM: '⭐',
  ANALISIS_IA_LISTO: '🎨',
};

const esMensaje = (n: NotificacionDto) => n.tipo === 'MENSAJE_DIRECTO';

function Contador({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-ink-950">
      {valor > 9 ? '9+' : valor}
    </span>
  );
}

/** Acceso directo a /mensajes con los mensajes directos sin leer. */
export function BotonMensajes() {
  const location = useLocation();
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);
  const marcarMensajesLeidos = useNotificacionesStore((s) => s.marcarMensajesLeidos);
  const sinLeer = notificaciones.filter((n) => esMensaje(n) && !n.leida).length;
  const enMensajes = location.pathname.startsWith('/mensajes');

  // Estando en el chat los avisos de mensaje ya se ven ahi: no se acumulan en el contador
  useEffect(() => {
    if (enMensajes && sinLeer > 0) marcarMensajesLeidos();
  }, [enMensajes, sinLeer, marcarMensajesLeidos]);

  return (
    <Link
      to="/mensajes"
      title="Mensajes"
      aria-label={sinLeer ? `Mensajes (${sinLeer} sin leer)` : 'Mensajes'}
      className={clsx(
        'relative grid h-9 w-9 place-items-center rounded-lg text-lg transition-colors hover:bg-ink-800',
        enMensajes ? 'bg-ink-800 text-paper' : 'text-paper-muted hover:text-paper',
      )}
    >
      <span aria-hidden>✉️</span>
      <Contador valor={sinLeer} />
    </Link>
  );
}

/** Campana con el panel de notificaciones (todo menos los mensajes directos, que van en su botón). */
export function CampanaNotificaciones() {
  const navigate = useNavigate();
  const sesion = useAuthStore((s) => s.sesion);
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);
  const conectado = useNotificacionesStore((s) => s.conectado);
  const marcarLeida = useNotificacionesStore((s) => s.marcarLeida);
  const marcarTodasLeidas = useNotificacionesStore((s) => s.marcarTodasLeidas);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const lista = notificaciones.filter((n) => !esMensaje(n));
  const sinLeer = lista.filter((n) => !n.leida).length;

  // Cerrar al hacer clic afuera o con Escape
  useEffect(() => {
    if (!abierto) return;
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

  /** A dónde lleva cada aviso; null si no hay una página propia que mostrar. */
  async function destino(n: NotificacionDto): Promise<string | null> {
    if (n.tipo === 'NUEVO_SEGUIDOR' && n.actorId) {
      // El evento no siempre trae el nombre (llega "Un artista"): se resuelve por id
      try {
        const { data } = await api.get<ArtistaResumen>(`/api/artistas/${n.actorId}`);
        return `/perfil/${data.nombreArtista}`;
      } catch {
        return null;
      }
    }
    if (n.tipo === 'SUSCRIPCION_PREMIUM' && sesion) return `/perfil/${sesion.nombreArtista}`;
    return null;
  }

  async function abrir(n: NotificacionDto) {
    marcarLeida(n.id);
    const ruta = await destino(n);
    if (ruta) {
      setAbierto(false);
      navigate(ruta);
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        title="Notificaciones"
        aria-label={sinLeer ? `Notificaciones (${sinLeer} sin leer)` : 'Notificaciones'}
        aria-expanded={abierto}
        className={clsx(
          'relative grid h-9 w-9 place-items-center rounded-lg text-lg transition-colors hover:bg-ink-800',
          abierto ? 'bg-ink-800 text-paper' : 'text-paper-muted hover:text-paper',
        )}
      >
        <span aria-hidden>🔔</span>
        <Contador valor={sinLeer} />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            // En móvil la campana no está en el borde: el panel se fija a los lados de la pantalla
            className="card fixed inset-x-4 top-16 z-50 flex max-h-[70vh] flex-col overflow-hidden p-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[22rem]"
            role="dialog"
            aria-label="Notificaciones"
          >
            <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Notificaciones</h2>
                <span
                  className={clsx('h-2 w-2 rounded-full', conectado ? 'bg-emerald-400' : 'bg-paper-dim')}
                  title={conectado ? 'Recibiendo en vivo' : 'Sin conexión en vivo'}
                />
              </div>
              {sinLeer > 0 && (
                <button type="button" onClick={marcarTodasLeidas} className="text-xs text-violet hover:underline">
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {lista.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-paper-muted">No tienes notificaciones todavía.</p>
            ) : (
              <ul className="overflow-y-auto">
                {lista.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void abrir(n)}
                      className={clsx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-800/70',
                        !n.leida && 'bg-violet/5',
                      )}
                    >
                      <span className="mt-0.5 text-base" aria-hidden>
                        {ICONOS[n.tipo] ?? '🔔'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block text-sm', n.leida ? 'text-paper-muted' : 'text-paper')}>{n.mensaje}</span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
