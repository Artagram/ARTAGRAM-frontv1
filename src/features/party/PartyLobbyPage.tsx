import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Stepper } from '../../components/ui/Stepper';
import { TextField } from '../../components/ui/TextField';
import { CodigoSalaBadge } from './CodigoSalaBadge';
import type { SalaFiestaResponse } from '../../types';

export function PartyLobbyPage() {
  const navigate = useNavigate();
  const sesion = useAuthStore((s) => s.sesion);

  const [duracion, setDuracion] = useState(60);
  const [cupo, setCupo] = useState(8);
  const [rondas, setRondas] = useState(3);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [uniendo, setUniendo] = useState(false);

  // Salas activas en las que participa el usuario
  const [salasActivas, setSalasActivas] = useState<SalaFiestaResponse[]>([]);
  const [cargandoSalas, setCargandoSalas] = useState(true);
  const [limpiando, setLimpiando] = useState(false);

  const cargarSalasActivas = useCallback(async () => {
    try {
      const { data } = await api.get<SalaFiestaResponse[]>('/api/fiestas/activas');
      setSalasActivas(data);
    } catch {
      // Ignorar fallo silencioso
    } finally {
      setCargandoSalas(false);
    }
  }, []);

  useEffect(() => {
    if (sesion) {
      cargarSalasActivas();
    }
  }, [sesion, cargarSalasActivas]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreando(true);
    try {
      const { data } = await api.post<SalaFiestaResponse>('/api/fiestas', {
        duracionRondaSegundos: duracion,
        cupoMaximo: cupo,
        totalRondas: rondas,
      });
      navigate(`/fiesta/${data.id}`);
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setCreando(false);
    }
  }

  async function unirse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUniendo(true);
    try {
      const { data } = await api.post<SalaFiestaResponse>('/api/fiestas/unirse', null, {
        params: { codigo: codigo.trim() },
      });
      navigate(`/fiesta/${data.id}`);
    } catch (err) {
      setError(extraerMensajeError(err, 'No encontramos una sala con ese código'));
    } finally {
      setUniendo(false);
    }
  }

  async function cerrarSala(salaId: string) {
    try {
      await api.delete(`/api/fiestas/${salaId}`);
      setSalasActivas((prev) => prev.filter((s) => s.id !== salaId));
      setAviso('Sala cerrada exitosamente.');
      setTimeout(() => setAviso(null), 3000);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cerrar la sala'));
    }
  }

  async function salirDeSala(salaId: string) {
    try {
      await api.post(`/api/fiestas/${salaId}/salir`);
      setSalasActivas((prev) => prev.filter((s) => s.id !== salaId));
      setAviso('Has salido de la sala.');
      setTimeout(() => setAviso(null), 3000);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo salir de la sala'));
    }
  }

  async function limpiarTodas() {
    setLimpiando(true);
    setError(null);
    try {
      await api.post('/api/fiestas/limpiar');
      setSalasActivas([]);
      setAviso('Todas tus salas activas han sido cerradas.');
      setTimeout(() => setAviso(null), 3500);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudieron limpiar las salas'));
    } finally {
      setLimpiando(false);
    }
  }

  return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 text-center">
          <span className="chip mb-3 inline-flex">Rondas cronometradas</span>
          <h1 className="font-display text-[40px] font-semibold leading-tight">
            Modo <span className="acento">fiesta</span>
          </h1>
          <p className="mt-2 text-paper-muted">
            Todos pintan con el mismo pincel y color durante la ronda. Nadie borra… salvo quien logre tomar el borrador.
          </p>
        </div>

        {/* Tarjetas de Crear y Unirse */}
        <div className="grid gap-6 sm:grid-cols-2">
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={crear}
            className="card card-fija borde-fiesta flex flex-col gap-4 p-6"
          >
            <h2 className="font-display text-lg font-semibold">Crear una sala</h2>
            <Stepper etiqueta="Duración de la ronda (segundos)" valor={duracion} min={5} max={600} paso={5} onCambio={setDuracion} />
            <Stepper etiqueta="Número de rondas" valor={rondas} min={1} max={10} onCambio={setRondas} />
            <Stepper etiqueta="Cupo máximo" valor={cupo} min={2} max={50} onCambio={setCupo} />
            <Button type="submit" cargando={creando}>
              Crear sala
            </Button>
          </motion.form>

          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onSubmit={unirse}
            className="card card-fija borde-fiesta flex flex-col gap-4 p-6"
          >
            <h2 className="font-display text-lg font-semibold">Unirme con un código</h2>
            <TextField
              label="Código de la sala"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="AB12CD"
              maxLength={6}
              className="py-4 text-center font-mono text-2xl uppercase tracking-[0.3em]"
            />
            <Button type="submit" variant="secondary" cargando={uniendo} className="mt-auto">
              Entrar a la sala
            </Button>
          </motion.form>
        </div>

        {error && (
          <p className="banner-error mt-6 text-center">
            {error}
          </p>
        )}

        {aviso && (
          <p className="glass mt-6 rounded-[14px] border-t-2 border-t-teal px-3 py-2 text-center text-sm text-paper">
            {aviso}
          </p>
        )}

        {/* Sección: Salas activas en las que participa el usuario */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-paper">Tus salas activas</h2>
              <span className="chip">
                {salasActivas.length}
              </span>
            </div>
            {salasActivas.length > 0 && (
              <button
                type="button"
                onClick={limpiarTodas}
                disabled={limpiando}
                className="btn-secondary border-coral/40 px-3 py-1.5 text-xs text-coral-light"
                title="Cierra y finaliza todas las salas activas en las que participas"
              >
                {limpiando ? 'Cerrando...' : 'Cerrar todas las salas'}
              </button>
            )}
          </div>

          {cargandoSalas ? (
            <Skeleton filas={2} className="sm:grid sm:grid-cols-2" claseFila="h-40" />
          ) : salasActivas.length === 0 ? (
            <div className="card card-fija p-8 text-center">
              <div className="mb-3 text-3xl">🎉</div>
              <p className="font-display text-xl font-semibold text-paper">
                No tienes salas <span className="acento">activas</span>
              </p>
              <p className="text-xs text-paper-dim mt-1">
                Crea una sala arriba o ingresa con un código para empezar a pintar en grupo.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {salasActivas.map((s) => {
                const esAnfitrion = s.anfitrionNombre === sesion?.nombreArtista;
                const enRonda = s.estado === 'EN_RONDA';
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card borde-fiesta flex flex-col justify-between gap-4 p-3.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <CodigoSalaBadge codigo={s.codigo} />
                        <span className="chip">
                          <span className="font-semibold tabular-nums text-paper">
                            {s.totalParticipantes}/{s.cupoMaximo}
                          </span>
                          {enRonda ? <span className="punto-vivo" aria-hidden /> : <span aria-hidden className="h-2 w-2 rounded-full bg-amber" />}
                          {enRonda ? `En ronda (#${s.numeroRonda})` : 'Esperando'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-paper-muted">
                          Anfitrión:{' '}
                          <span className="font-semibold text-paper">
                            {s.anfitrionNombre}
                            {esAnfitrion && ' (Tú)'}
                          </span>
                        </p>
                        <p className="text-paper-dim">
                          Rondas: <span className="text-paper">{s.numeroRonda}</span> de{' '}
                          <span className="text-paper">{s.totalRondas ?? 3}</span> ({s.duracionRondaSegundos}s c/u)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-paper/10">
                      <Button
                        type="button"
                        onClick={() => navigate(`/fiesta/${s.id}`)}
                        className="flex-1 py-1.5 text-xs"
                      >
                        Entrar a la sala
                      </Button>
                      {esAnfitrion ? (
                        <button
                          type="button"
                          onClick={() => cerrarSala(s.id)}
                          className="px-3 py-1.5 text-xs text-coral-light hover:text-paper rounded-full border border-coral/40 transition-colors hover:bg-coral/20"
                          title="Cerrar la sala permanentemente para todos los participantes"
                        >
                          Cerrar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => salirDeSala(s.id)}
                          className="btn-tertiary px-3 py-1.5 text-xs"
                          title="Salir de esta sala"
                        >
                          Salir
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}
