import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import clsx from 'clsx';
import { TextField } from '../../components/ui/TextField';
import { ComunidadesRecomendadas } from './ComunidadesRecomendadas';
import type { ComunidadResponse } from '../../types';

export function CommunityListPage() {
  const premium = useAuthStore((s) => s.sesion?.premium ?? false);
  const [comunidades, setComunidades] = useState<ComunidadResponse[]>([]);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [publica, setPublica] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [codigoUnirse, setCodigoUnirse] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMisComunidades();
  }, []);

  function cargarMisComunidades() {
    setCargando(true);
    return api
      .get<ComunidadResponse[]>('/api/comunidades/mias')
      .then((r) => setComunidades(r.data))
      .catch((err) => setError(extraerMensajeError(err)))
      .finally(() => setCargando(false));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post<ComunidadResponse>('/api/comunidades', { nombre, descripcion, publica });
      await cargarMisComunidades();
      setMostrarCrear(false);
      setNombre('');
      setDescripcion('');
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  async function unirsePorId(id: string) {
    try {
      await api.post<ComunidadResponse>(`/api/comunidades/${id}/miembros`);
      await cargarMisComunidades();
    } catch (err) {
      setError(extraerMensajeError(err));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight">Comunidades</h1>
          <p className="text-sm text-paper-muted">Crea o entra a una para pintar sobre un lienzo compartido.</p>
        </div>
        <Button onClick={() => setMostrarCrear((v) => !v)}>{mostrarCrear ? 'Cancelar' : 'Crear comunidad'}</Button>
      </div>

      {error && <p className="banner-error mb-4">{error}</p>}

      {mostrarCrear && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={crear}
          className="card card-fija borde-comunidad mb-8 flex flex-col gap-4 p-6"
        >
          <TextField label="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Acuarela Urbana" />
          <TextField
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="¿Qué dibujan aquí?"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="tabs" role="radiogroup" aria-label="Visibilidad">
              <button type="button" role="radio" aria-checked={publica} onClick={() => setPublica(true)} className={clsx('tab', publica && 'tab-activa')}>
                Pública
              </button>
              <button type="button" role="radio" aria-checked={!publica} onClick={() => setPublica(false)} className={clsx('tab', !publica && 'tab-activa')}>
                Privada
              </button>
            </div>
            {publica && <span className="text-xs text-paper-muted">Cualquiera se puede unir</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" cargando={enviando}>
              Crear
            </Button>
            {!premium && (
              <span className="text-xs text-paper-dim">
                Plan gratis: hasta 3 comunidades creadas.{' '}
                <Link to="/planes" className="text-amber hover:underline">
                  Ilimitadas con PRO
                </Link>
              </span>
            )}
          </div>
        </motion.form>
      )}

      <div className="card card-fija mb-8 flex flex-wrap items-end gap-3 p-3.5">
        <TextField
          label="Unirme por ID de comunidad"
          value={codigoUnirse}
          onChange={(e) => setCodigoUnirse(e.target.value)}
          placeholder="pega el id que te compartieron"
          className="min-w-[240px] flex-1 font-mono"
        />
        <Button variant="secondary" onClick={() => codigoUnirse && unirsePorId(codigoUnirse)}>
          Unirme
        </Button>
      </div>

      {cargando ? (
        <Skeleton filas={3} className="sm:grid sm:grid-cols-2 lg:grid-cols-3" claseFila="h-40" />
      ) : comunidades.length === 0 ? (
        <EstadoVacio />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comunidades.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <Link
                to={`/comunidades/${c.id}`}
                className="card borde-comunidad group block h-full p-3.5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="chip">{c.miRol ?? 'miembro'}</span>
                  <span className="text-xs text-paper-dim">{c.totalMiembros} miembros</span>
                </div>
                <h3 className="font-display text-lg font-semibold group-hover:text-coral">{c.nombre}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-paper-muted">{c.descripcion || 'Sin descripción'}</p>
                <div className="mt-3 flex items-center justify-between border-t border-paper/10 pt-2 text-[11px] text-paper-dim">
                  <span className="font-mono truncate max-w-[180px]">ID: {c.id}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigator.clipboard.writeText(c.id);
                    }}
                    className="flex-shrink-0 text-teal transition-colors hover:text-paper"
                  >
                    Copiar ID
                  </button>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <ComunidadesRecomendadas onUnida={() => void cargarMisComunidades()} />
    </div>
  );
}

function EstadoVacio() {
  return (
    <div className="card card-fija flex flex-col items-center gap-3 p-12 text-center">
      <div className="text-4xl">🎨</div>
      <h3 className="font-display text-xl font-semibold">
        Todavía no tienes <span className="acento text-teal">comunidades</span>
      </h3>
      <p className="max-w-sm text-sm text-paper-muted">
        Crea una para juntar gente que dibuja lo que a ti te gusta, o pega el ID de una que te hayan compartido.
      </p>
    </div>
  );
}
