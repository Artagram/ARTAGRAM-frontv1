import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { Button } from '../../components/ui/Button';
import {
  agruparPorDia,
  cargarNotificaciones,
  destinoNotificacion,
  marcarLeida,
  marcarTodasLeidas,
  type Notificacion,
} from './notificacionesApi';
import { useNotificacionesStore } from './notificacionesStore';

export function NotificationsPage() {
  const navigate = useNavigate();
  const nombrePropio = useAuthStore((s) => s.sesion?.nombreArtista ?? '');
  const lista = useNotificacionesStore((s) => s.lista);
  const noLeidas = useNotificacionesStore((s) => s.noLeidas);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarNotificaciones()
      .then(useNotificacionesStore.getState().fijarLista)
      .catch((err) => setError(extraerMensajeError(err, 'No pudimos cargar tus notificaciones')))
      .finally(() => setCargando(false));
  }, []);

  function abrir(n: Notificacion) {
    if (!n.leida) {
      useNotificacionesStore.getState().marcarLeida(n.id);
      marcarLeida(n.id).catch(() => undefined);
    }
    const destino = destinoNotificacion(n, nombrePropio);
    if (destino) navigate(destino);
  }

  async function marcarTodas() {
    setError(null);
    try {
      await marcarTodasLeidas();
      useNotificacionesStore.getState().marcarTodas();
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos marcar las notificaciones'));
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Notificaciones</h1>
        {noLeidas > 0 && (
          <Button variant="ghost" onClick={marcarTodas}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}

      {cargando ? (
        <p className="py-10 text-center text-paper-muted">Cargando…</p>
      ) : lista.length === 0 ? (
        !error && <p className="py-10 text-center text-paper-muted">Aún no tienes notificaciones.</p>
      ) : (
        agruparPorDia(lista).map((grupo) => (
          <section key={grupo.dia} className="mb-6">
            <p className="label mb-2">{grupo.dia}</p>
            <div className="space-y-2">
              {grupo.notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrir(n)}
                  className={`card flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-ink-800 ${
                    n.leida ? 'opacity-70' : ''
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.leida ? 'bg-transparent' : 'bg-coral'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm text-paper">{n.mensaje}</span>
                    <span className="mt-0.5 block text-xs text-paper-dim">
                      {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
                    </span>
                  </span>
                  {!n.leida && <span className="sr-only">Sin leer</span>}
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
