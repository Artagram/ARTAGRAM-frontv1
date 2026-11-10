import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import { BotonSeguir } from './BotonSeguir';
import type { ArtistaResumen, PerfilResponse, Seguimiento } from '../../types';

interface Props {
  onSeguimientoCambiado: () => void;
}

interface Resultado extends ArtistaResumen {
  /** Nombre con el que se encontro: es el que resuelve /perfil/:nombreArtista. */
  ruta: string;
}

/**
 * artagram-users no tiene busqueda (no hay GET /api/artistas?q=): se busca por
 * nombre exacto con el perfil publico y despues se pide el estado de
 * seguimiento. Devuelve null si no existe o si es el propio usuario.
 */
async function buscarPorNombre(nombre: string, signal: AbortSignal): Promise<Resultado | null> {
  try {
    const { data: perfil } = await api.get<PerfilResponse>(`/api/perfiles/${encodeURIComponent(nombre)}`, { signal });
    if (perfil.esPropio) return null;
    const { data } = await api.get<ArtistaResumen>(`/api/artistas/${perfil.usuarioId}`, { signal });
    return { ...data, ruta: nombre };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export function BuscarArtistas({ onSeguimientoCambiado }: Props) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);

  const consulta = texto.trim();
  const visible = consulta.length > 0;

  useEffect(() => {
    if (!consulta) return;
    const controlador = new AbortController();
    const temporizador = setTimeout(() => {
      setBuscando(true);
      buscarPorNombre(consulta, controlador.signal)
        .then((encontrado) => setResultados(encontrado ? [encontrado] : []))
        .catch(() => {})
        .finally(() => setBuscando(false));
    }, 300);
    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [consulta]);

  function alCambiarSeguimiento(usuarioId: string, seguimiento: Seguimiento) {
    setResultados((prev) => prev.map((a) => (a.usuarioId === usuarioId ? { ...a, ...seguimiento } : a)));
    onSeguimientoCambiado();
  }

  return (
    <div className="mb-6 rounded-xl border border-ink-700 bg-ink-900/40 p-4">
      <label className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-2 focus-within:border-coral/50">
        <span aria-hidden>🔍</span>
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar artista por su nombre de usuario…"
          className="w-full bg-transparent text-sm text-paper placeholder:text-paper-dim focus:outline-none"
          aria-label="Buscar artista por su nombre de usuario"
        />
        {buscando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-coral border-t-transparent" />}
      </label>

      {visible && (
        <div className="mt-3">
          {resultados.length === 0 && !buscando ? (
            <p className="text-sm text-paper-muted">
              No hay ningún artista llamado "{consulta}". Escribe el nombre de usuario exacto.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink-800">
              {resultados.map((a) => (
                <li key={a.usuarioId} className="flex items-center justify-between gap-3 py-2">
                  <Link to={`/perfil/${a.ruta}`} className="flex min-w-0 items-center gap-3 hover:text-coral">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-700 text-xs font-semibold uppercase">
                      {a.nombreArtista.slice(0, 2)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.nombreArtista}</span>
                      <span className="block text-[11px] text-paper-dim">
                        {a.seguidores} {a.seguidores === 1 ? 'seguidor' : 'seguidores'}
                      </span>
                    </span>
                  </Link>
                  <BotonSeguir
                    usuarioId={a.usuarioId}
                    loSigo={a.loSigo}
                    onCambio={(s) => alCambiarSeguimiento(a.usuarioId, s)}
                    className="text-xs px-3 py-1"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
