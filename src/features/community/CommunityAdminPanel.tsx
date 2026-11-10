import { useEffect, useState } from 'react';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { TextField } from '../../components/ui/TextField';
import type { ComunidadResponse, MiembroComunidadDto } from '../../types';

interface Props {
  comunidad: ComunidadResponse;
  esAdmin: boolean;
  esCreador: boolean;
  onMiembrosActualizados?: () => void;
}

export function CommunityAdminPanel({ comunidad, esAdmin, esCreador, onMiembrosActualizados }: Props) {
  const [pestana, setPestana] = useState<'miembros' | 'invitar' | 'publicaciones'>('miembros');
  const [miembros, setMiembros] = useState<MiembroComunidadDto[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ mensaje: string; accion: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Formulario invitar
  const [nombreArtistaInvitar, setNombreArtistaInvitar] = useState('');
  const [invitando, setInvitando] = useState(false);

  // Formulario borrar publicación
  const [publicacionIdBorrar, setPublicacionIdBorrar] = useState('');
  const [borrandoPub, setBorrandoPub] = useState(false);

  useEffect(() => {
    cargarMiembros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comunidad.id]);

  function avisarExito(msg: string) {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
  }

  async function cargarMiembros() {
    setCargandoMiembros(true);
    try {
      const { data } = await api.get<MiembroComunidadDto[]>(`/api/comunidades/${comunidad.id}/miembros`);
      setMiembros(data);
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setCargandoMiembros(false);
    }
  }

  function expulsarMiembro(usuarioId: string, nombre: string) {
    setConfirmacion({
      mensaje: `¿Estás seguro de que deseas expulsar a @${nombre} de la comunidad?`,
      accion: () => void ejecutarExpulsion(usuarioId, nombre),
    });
  }

  async function ejecutarExpulsion(usuarioId: string, nombre: string) {
    setError(null);
    try {
      await api.delete(`/api/comunidades/${comunidad.id}/miembros/${usuarioId}`);
      avisarExito(`@${nombre} fue expulsado de la comunidad`);
      await cargarMiembros();
      onMiembrosActualizados?.();
    } catch (err) {
      setError(extraerMensajeError(err));
    }
  }

  async function cambiarRol(usuarioId: string, nombre: string, nuevoRol: string) {
    setError(null);
    try {
      await api.patch(`/api/comunidades/${comunidad.id}/miembros/${usuarioId}/rol`, { rol: nuevoRol });
      avisarExito(`Rol de @${nombre} actualizado a ${nuevoRol}`);
      await cargarMiembros();
      onMiembrosActualizados?.();
    } catch (err) {
      setError(extraerMensajeError(err));
    }
  }

  async function invitarUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreArtistaInvitar.trim()) return;
    setError(null);
    setInvitando(true);
    try {
      const { data } = await api.post<MiembroComunidadDto>(`/api/comunidades/${comunidad.id}/miembros/invitar`, {
        nombreArtista: nombreArtistaInvitar.trim(),
      });
      avisarExito(`¡@${data.nombreArtista} ha sido añadido con éxito!`);
      setNombreArtistaInvitar('');
      await cargarMiembros();
      onMiembrosActualizados?.();
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setInvitando(false);
    }
  }

  function borrarPublicacion(e: React.FormEvent) {
    e.preventDefault();
    const idPub = publicacionIdBorrar.trim();
    if (!idPub) return;
    setConfirmacion({
      mensaje: `¿Confirmas eliminar la publicación ${idPub}? Esta acción no se puede deshacer.`,
      accion: () => void ejecutarBorrado(idPub),
    });
  }

  async function ejecutarBorrado(idPub: string) {
    setError(null);
    setBorrandoPub(true);
    try {
      await api.delete(`/api/publicaciones/${idPub}`);
      avisarExito(`Publicación ${idPub} eliminada exitosamente.`);
      setPublicacionIdBorrar('');
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setBorrandoPub(false);
    }
  }

  return (
    <div className="card card-fija p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-paper/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h2 className="font-display text-xl font-semibold text-paper">Panel de Control de Comunidad</h2>
          </div>
          <p className="text-xs text-paper-muted">
            Gestiona miembros, asigna moderadores e invita artistas a <span className="text-coral font-medium">{comunidad.nombre}</span>
          </p>
        </div>

        {/* Pestañas del panel */}
        <div className="tabs flex-wrap">
          <button
            type="button"
            onClick={() => setPestana('miembros')}
            className={`tab px-3 text-xs ${pestana === 'miembros' ? 'tab-activa' : ''}`}
          >
            👥 Miembros ({miembros.length})
          </button>
          <button
            type="button"
            onClick={() => setPestana('invitar')}
            className={`tab px-3 text-xs ${pestana === 'invitar' ? 'tab-activa' : ''}`}
          >
            ✉️ Invitar usuario
          </button>
          <button
            type="button"
            onClick={() => setPestana('publicaciones')}
            className={`tab px-3 text-xs ${pestana === 'publicaciones' ? 'tab-activa' : ''}`}
          >
            🗑️ Moderar publicaciones
          </button>
        </div>
      </div>

      {error && <div className="banner-error mb-4">{error}</div>}
      {mensajeExito && <div className="glass mb-4 rounded-[14px] border-t-2 border-t-teal px-3 py-2 text-sm text-paper">{mensajeExito}</div>}

      {/* PESTAÑA 1: LISTA Y EXPULSIÓN DE MIEMBROS */}
      {pestana === 'miembros' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-paper-dim px-2">
            <span>Artista / Usuario</span>
            <span>Rol y Acciones</span>
          </div>

          {cargandoMiembros ? (
            <Skeleton filas={3} claseFila="h-14" />
          ) : miembros.length === 0 ? (
            <div className="py-6 text-center text-sm text-paper-muted">No hay miembros registrados todavía.</div>
          ) : (
            <div className="divide-y divide-paper/10 rounded-xl border border-paper/10 overflow-hidden">
              {miembros.map((m) => {
                const esElCreador = m.nombreArtista === comunidad.creador;
                return (
                  <div key={m.usuarioId} className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-paper/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-600 text-xs font-semibold uppercase text-paper">
                        {m.nombreArtista.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-paper">@{m.nombreArtista}</p>
                        <p className="text-[11px] text-paper-dim font-mono">{m.usuarioId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          m.rol === 'ADMIN'
                            ? 'bg-amber/10 text-amber border border-amber/30'
                            : m.rol === 'MODERADOR'
                            ? 'bg-teal/10 text-teal border border-teal/30'
                            : 'bg-paper/10 text-paper-muted'
                        }`}
                      >
                        {m.rol}
                      </span>

                      {/* Solo Admin/Creador puede cambiar roles o expulsar */}
                      {esAdmin && !esElCreador && (
                        <>
                          <select
                            value={m.rol}
                            onChange={(e) => cambiarRol(m.usuarioId, m.nombreArtista, e.target.value)}
                            className="input w-auto rounded-full py-1 text-xs"
                          >
                            <option value="MIEMBRO">Miembro</option>
                            <option value="MODERADOR">Moderador</option>
                            <option value="ADMIN">Admin</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => expulsarMiembro(m.usuarioId, m.nombreArtista)}
                            className="btn-secondary border-coral/40 px-3 py-1 text-xs text-coral-light"
                            title="Sacar usuario de la comunidad"
                          >
                            Sacar
                          </button>
                        </>
                      )}

                      {esElCreador && (
                        <span className="text-[11px] italic text-paper-dim">Creador</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: INVITAR USUARIOS */}
      {pestana === 'invitar' && (
        <form onSubmit={invitarUsuario} className="flex flex-col gap-4 max-w-lg">
          <p className="text-sm text-paper-muted">
            Ingresa el nombre de artista de la persona que deseas invitar. Se unirá inmediatamente como miembro a la comunidad.
          </p>

          <div className="flex gap-2">
            <TextField
              placeholder="ej: sam_pixel"
              value={nombreArtistaInvitar}
              onChange={(e) => setNombreArtistaInvitar(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" cargando={invitando}>
              Invitar
            </Button>
          </div>
        </form>
      )}

      {/* PESTAÑA 3: MODERACIÓN DE PUBLICACIONES */}
      {pestana === 'publicaciones' && (
        <div className="flex flex-col gap-4 max-w-lg">
          <div>
            <h3 className="text-sm font-semibold text-paper">Borrar publicación como Administrador</h3>
            <p className="text-xs text-paper-muted mt-1">
              Como administrador o moderador, puedes eliminar cualquier publicación inapropiada o que infrinja las normas ingresando su ID.
            </p>
          </div>

          <form onSubmit={borrarPublicacion} className="flex gap-2">
            <TextField
              placeholder="UUID de la publicación (ej. c35f7ac8-7096-...)"
              value={publicacionIdBorrar}
              onChange={(e) => setPublicacionIdBorrar(e.target.value)}
              className="flex-1 font-mono text-xs"
              required
            />
            <Button type="submit" cargando={borrandoPub}>
              Eliminar
            </Button>
          </form>
        </div>
      )}

      {esCreador && (
        <div className="mt-6 border-t border-paper/10 pt-3 flex justify-between items-center text-xs text-paper-dim">
          <span>Creador oficial de la comunidad</span>
          <span>Permisos completos de administración y moderación</span>
        </div>
      )}
      {confirmacion && (
        <Modal etiquetadoPor="confirmar-accion" onCerrar={() => setConfirmacion(null)}>
          <h2 id="confirmar-accion" className="font-display text-xl font-semibold">
            ¿Estás <span className="acento">seguro</span>?
          </h2>
          <p className="mt-2 break-words text-sm text-paper-muted">{confirmacion.mensaje}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmacion(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                confirmacion.accion();
                setConfirmacion(null);
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
