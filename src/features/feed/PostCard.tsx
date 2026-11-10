import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { stompService } from '../../lib/stompClient';
import { ESTADO_PENDIENTE, esperarAnalisis } from './analisisApi';
import { descargarObra } from './descargaApi';
import { alternarDestacada } from '../profile/obrasApi';
import { ModalReportar } from '../moderacion/ModalReportar';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCerrarAlExterior } from '../../components/ui/useCerrarAlExterior';
import type {
  AnalisisObraDto,
  AnalisisTecnicoResultado,
  ComentarioDto,
  ComentarioEvento,
  LikeResponse,
  PublicacionDto,
  LikeEvento,
} from '../../types';

interface PostCardProps {
  publicacion: PublicacionDto;
  onEliminada?: (id: string) => void;
  onActualizada?: (p: PublicacionDto) => void;
  variante?: 'tarjeta' | 'detalle';
}

export function PostCard({ publicacion, onEliminada, onActualizada, variante = 'tarjeta' }: PostCardProps) {
  const detalle = variante === 'detalle';
  const sesion = useAuthStore((s) => s.sesion);
  const [pub, setPub] = useState(publicacion);
  const [meGusta, setMeGusta] = useState(pub.meGusta);
  const [contadorLikes, setContadorLikes] = useState(pub.contadorLikes);
  const [animandoLike, setAnimandoLike] = useState(false);
  const [procesoAbierto, setProcesoAbierto] = useState(false);
  const [pasoVisor, setPasoVisor] = useState<number | null>(null);

  // Estados de eliminación
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const [descargando, setDescargando] = useState(false);

  const [reportando, setReportando] = useState(false);
  const [reportada, setReportada] = useState(false);

  // Estados de Edición
  const [editando, setEditando] = useState(false);
  const [editTitulo, setEditTitulo] = useState(pub.titulo);
  const [editDescripcion, setEditDescripcion] = useState(pub.descripcion);
  const [editEtiquetas, setEditEtiquetas] = useState(pub.etiquetas.join(', '));
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  // Estados de Comentarios en Vivo
  const [comentariosAbiertos, setComentariosAbiertos] = useState(false);
  const [comentarios, setComentarios] = useState<ComentarioDto[]>([]);
  const [cargandoComentarios, setCargandoComentarios] = useState(false);
  const [comentariosCargados, setComentariosCargados] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [contadorComentarios, setContadorComentarios] = useState(pub.contadorComentarios ?? 0);
  const [errorComentario, setErrorComentario] = useState<string | null>(null);

  // Estados de IA
  const [iaAbierta, setIaAbierta] = useState(false);
  const [analisisIa, setAnalisisIa] = useState<AnalisisTecnicoResultado | null>(null);
  const [cargandoIa, setCargandoIa] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);

  const esAutor = sesion?.usuarioId === pub.autorId;

  // El feed también necesita la conexión en tiempo real (es idempotente si ya está abierta)
  useEffect(() => {
    if (sesion?.accessToken) stompService.conectar(sesion.accessToken);
  }, [sesion?.accessToken]);

  // Likes y comentarios en vivo: se escuchan siempre (no solo con el panel abierto)
  // para que los contadores se actualicen en todas las pantallas sin recargar.
  useEffect(() => {
    const base = `/topic/publicaciones/${pub.id}`;
    const desuscribirLikes = stompService.suscribir<LikeEvento>(`${base}/likes`, (evento) => {
      setContadorLikes(evento.contadorLikes);
    });
    const desuscribirComentarios = stompService.suscribir<ComentarioEvento>(`${base}/comentarios`, (evento) => {
      if (!evento.comentario) return;
      setContadorComentarios(evento.contadorComentarios);
      if (evento.tipo === 'COMENTARIO_CREADO') {
        setComentarios((prev) => (prev.some((c) => c.id === evento.comentario.id) ? prev : [...prev, evento.comentario]));
      } else {
        setComentarios((prev) => prev.filter((c) => c.id !== evento.comentario.id));
      }
    });
    return () => {
      desuscribirLikes();
      desuscribirComentarios();
    };
  }, [pub.id]);

  // Cargar comentarios iniciales al desplegar
  async function toggleComentarios() {
    const nuevoEstado = !comentariosAbiertos;
    setComentariosAbiertos(nuevoEstado);
    if (nuevoEstado && !comentariosCargados) {
      setCargandoComentarios(true);
      try {
        const { data } = await api.get<ComentarioDto[]>(`/api/publicaciones/${pub.id}/comentarios`);
        // Combina con los que hayan llegado en vivo mientras cargaba, sin duplicar
        setComentarios((enVivo) => [...data, ...enVivo.filter((c) => !data.some((d) => d.id === c.id))]);
        setComentariosCargados(true);
      } catch (err) {
        setErrorComentario(extraerMensajeError(err, 'No se pudieron cargar los comentarios'));
      } finally {
        setCargandoComentarios(false);
      }
    }
  }

  // Enviar comentario plano
  async function enviarComentario(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoComentario.trim() || enviandoComentario) return;

    setEnviandoComentario(true);
    setErrorComentario(null);
    try {
      const { data } = await api.post<ComentarioDto>(`/api/publicaciones/${pub.id}/comentarios`, {
        contenido: nuevoComentario.trim(),
      });
      setComentarios((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data]));
      setContadorComentarios((c) => c + 1);
      setNuevoComentario('');
    } catch (err) {
      setErrorComentario(extraerMensajeError(err, 'No se pudo enviar el comentario'));
    } finally {
      setEnviandoComentario(false);
    }
  }

  // Eliminar comentario
  async function borrarComentario(comentarioId: string) {
    try {
      await api.delete(`/api/publicaciones/${pub.id}/comentarios/${comentarioId}`);
      setComentarios((prev) => prev.filter((c) => c.id !== comentarioId));
      setContadorComentarios((c) => Math.max(0, c - 1));
    } catch (err) {
      setErrorComentario(extraerMensajeError(err, 'No se pudo eliminar el comentario'));
    }
  }

  // Guardar edición de la publicación con optimistic locking
  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitulo.trim()) return;

    setGuardandoEdicion(true);
    setErrorEdicion(null);
    try {
      const tagsArray = editEtiquetas
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { data } = await api.put<PublicacionDto>(`/api/publicaciones/${pub.id}`, {
        titulo: editTitulo.trim(),
        descripcion: editDescripcion.trim(),
        etiquetas: tagsArray,
        version: pub.version ?? 0,
      });

      setPub(data);
      onActualizada?.(data);
      setEditando(false);
    } catch (err) {
      setErrorEdicion(extraerMensajeError(err, 'No se pudo guardar la edición'));
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function alternarEstrella() {
    setErrorAccion(null);
    try {
      const actualizada = await alternarDestacada(pub);
      setPub(actualizada);
      onActualizada?.(actualizada);
    } catch (err) {
      setErrorAccion(extraerMensajeError(err, 'No pudimos actualizar la obra'));
    }
  }

  async function descargar() {
    setErrorAccion(null);
    setDescargando(true);
    try {
      await descargarObra(pub.id);
    } catch (err) {
      setErrorAccion(extraerMensajeError(err, 'No pudimos descargar la obra'));
    } finally {
      setDescargando(false);
    }
  }

  // Alternar like
  async function alternarLike() {
    const anteriorMeGusta = meGusta;
    const anteriorContador = contadorLikes;
    setMeGusta(!meGusta);
    setContadorLikes((c) => c + (meGusta ? -1 : 1));
    setAnimandoLike(true);
    setTimeout(() => setAnimandoLike(false), 350);
    try {
      const { data } = await api.post<LikeResponse>(`/api/publicaciones/${pub.id}/like`);
      setMeGusta(data.meGusta);
      setContadorLikes(data.contadorLikes);
    } catch {
      setMeGusta(anteriorMeGusta);
      setContadorLikes(anteriorContador);
    }
  }

  // Eliminar publicación
  async function eliminar() {
    setBorrando(true);
    setErrorBorrado(null);
    try {
      await api.delete(`/api/publicaciones/${pub.id}`);
      onEliminada?.(pub.id);
    } catch (err) {
      setErrorBorrado(extraerMensajeError(err, 'No se pudo eliminar la publicación'));
      setBorrando(false);
      setConfirmandoBorrado(false);
    }
  }

  // Consultar o generar feedback técnico de IA
  async function toggleIa() {
    const nuevoEstado = !iaAbierta;
    setIaAbierta(nuevoEstado);
    if (nuevoEstado && !analisisIa) {
      setCargandoIa(true);
      setErrorIa(null);
      try {
        // Intentar obtener el último análisis guardado primero (historial)
        const { data } = await api.get<AnalisisObraDto>(`/api/publicaciones/${pub.id}/analisis`);
        setAnalisisIa(data.estado === ESTADO_PENDIENTE ? await esperarAnalisis(pub.id) : data);
      } catch {
        // Si no existe, dejamos listo para que el usuario solicite uno
        setAnalisisIa(null);
      } finally {
        setCargandoIa(false);
      }
    }
  }

  async function pedirAnalisisIa() {
    setCargandoIa(true);
    setErrorIa(null);
    try {
      await api.post(`/api/publicaciones/${pub.id}/analisis`);
      setAnalisisIa(await esperarAnalisis(pub.id));
    } catch (err) {
      setErrorIa(extraerMensajeError(err, 'No se pudo generar el análisis de IA'));
    } finally {
      setCargandoIa(false);
    }
  }

  const opcionesMenu: OpcionMenu[] = [
    ...(sesion && !esAutor
      ? [{ texto: reportada ? 'Reportada' : 'Reportar', accion: () => setReportando(true), desactivada: reportada }]
      : []),
    ...(esAutor
      ? [
          { texto: 'Editar', accion: () => setEditando(true) },
          { texto: pub.destacada ? 'Quitar de destacadas' : 'Destacar', accion: alternarEstrella },
          { texto: 'Eliminar', accion: () => setConfirmandoBorrado(true), peligro: true },
        ]
      : []),
  ];

  const cabecera = (
    <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
      <Link to={`/perfil/${pub.autorNombre}`} className="group flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-ink-600 text-xs font-semibold uppercase">
          {pub.autorNombre.slice(0, 2)}
        </span>
        <span className="truncate text-sm font-medium text-paper group-hover:text-coral">{pub.autorNombre}</span>
      </Link>
      <div className="flex flex-shrink-0 items-center gap-1">
        {pub.destacada && (
          <span className="text-sm text-amber" title="Obra destacada">
            ★
          </span>
        )}
        <span className="text-[11px] text-paper-dim">
          {formatDistanceToNow(new Date(pub.creadoEn), { addSuffix: true, locale: es })}
        </span>
        {opcionesMenu.length > 0 && <MenuObra opciones={opcionesMenu} />}
      </div>
    </div>
  );

  const avisos = (
    <>
      {errorAccion && <p className="px-3.5 pt-2 text-xs text-coral-light">{errorAccion}</p>}

      {pub.oculta && (
        <p className="banner-aviso mx-3.5 mt-2 text-xs">Oculta mientras se revisa. Solo tú y los administradores pueden verla.</p>
      )}

      <AnimatePresence>
        {confirmandoBorrado && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden border-y border-coral/30 bg-coral/10 px-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <p className="text-sm text-paper">¿Eliminar esta publicación? No se puede deshacer.</p>
              <div className="flex gap-2">
                <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => setConfirmandoBorrado(false)} disabled={borrando}>
                  Cancelar
                </Button>
                <Button className="px-3 py-1 text-xs" onClick={eliminar} disabled={borrando}>
                  {borrando ? 'Eliminando…' : 'Sí, eliminar'}
                </Button>
              </div>
            </div>
            {errorBorrado && <p className="pb-2 text-xs text-coral-light">{errorBorrado}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editando && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 border-y border-paper/10 p-3.5"
          >
            <form onSubmit={guardarEdicion} className="flex flex-col gap-3">
              <h4 className="text-base font-semibold text-paper">Editar publicación</h4>
              <div>
                <label className="label">Título</label>
                <input type="text" value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} className="input mt-1 py-1.5" required />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} rows={2} className="input mt-1 py-1.5" />
              </div>
              <div>
                <label className="label">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={editEtiquetas}
                  onChange={(e) => setEditEtiquetas(e.target.value)}
                  className="input mt-1 py-1.5"
                  placeholder="acuarela, paisaje, estudio"
                />
              </div>
              {errorEdicion && <p className="text-xs text-coral">{errorEdicion}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" className="px-3 py-1 text-xs" onClick={() => setEditando(false)} disabled={guardandoEdicion}>
                  Cancelar
                </Button>
                <Button type="submit" className="px-3 py-1 text-xs" disabled={guardandoEdicion}>
                  {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const fotosProceso = pub.imagenesProcesoUrls.length;

  const imagenTarjeta = (
    <div className="relative mt-3">
      <img src={pub.obraFinalUrl} alt={pub.titulo} className="max-h-[560px] w-full object-cover" loading="lazy" />
      {fotosProceso > 0 && (
        <button
          type="button"
          onClick={() => setProcesoAbierto((v) => !v)}
          aria-expanded={procesoAbierto}
          className="glass absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-xs font-medium text-paper"
        >
          ▶ proceso · {fotosProceso} {fotosProceso === 1 ? 'foto' : 'fotos'}
        </button>
      )}
    </div>
  );

  const miniaturasProceso = procesoAbierto && fotosProceso > 0 && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="flex gap-2 overflow-x-auto border-t border-paper/10 px-3.5 py-3"
    >
      {pub.imagenesProcesoUrls.map((url, i) => (
        <img key={i} src={url} alt={`Paso ${i + 1}`} className="h-28 w-28 flex-shrink-0 rounded-lg object-cover" />
      ))}
    </motion.div>
  );

  // Vista de detalle: la obra final es el último paso de la línea de tiempo.
  const pasosVisor = [...pub.imagenesProcesoUrls, pub.obraFinalUrl];
  const pasoVisible = pasoVisor ?? pasosVisor.length - 1;
  const visorDetalle = (
    <div className="flex flex-col justify-center bg-ink-950/50 p-3 lg:min-h-[70vh]">
      <img
        src={pasosVisor[pasoVisible]}
        alt={pasoVisible === pasosVisor.length - 1 ? pub.titulo : `Paso ${pasoVisible + 1}`}
        className="max-h-[75vh] w-full rounded-lg object-contain"
      />
      {fotosProceso > 0 && (
        <div className="mt-3 flex gap-1" role="group" aria-label="Línea de tiempo del proceso">
          {pasosVisor.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPasoVisor(i)}
              aria-label={i === pasosVisor.length - 1 ? 'Obra final' : `Paso ${i + 1}`}
              aria-current={i === pasoVisible ? 'step' : undefined}
              className="flex h-11 flex-1 items-center sm:h-5"
            >
              <span className={`h-1.5 w-full rounded-full transition-colors ${i === pasoVisible ? 'bg-coral' : 'bg-paper/20 hover:bg-paper/40'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const cuerpo = (
    <div className="px-3.5 py-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className={`font-display font-semibold ${detalle ? 'text-[32px] leading-tight' : 'text-base'}`}>{pub.titulo}</h3>
          {pub.descripcion && <p className="mt-1 text-sm text-paper-muted">{pub.descripcion}</p>}
        </div>
        {pub.editadoEn && <span className="text-[10px] italic text-paper-dim">editado</span>}
      </div>

      {pub.etiquetas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pub.etiquetas.map((t) => (
            <span key={t} className="chip text-xs">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-paper/10 pt-1.5">
        <div className="flex items-center">
          <button onClick={alternarLike} aria-pressed={meGusta} aria-label="Me gusta" className="flex h-11 items-center gap-1.5 pr-3 text-sm transition-transform active:scale-95 sm:h-8">
            <motion.span
              animate={animandoLike ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.35 }}
              className={meGusta ? 'text-coral' : 'text-paper-muted'}
            >
              {meGusta ? '♥' : '♡'}
            </motion.span>
            <span className={meGusta ? 'font-medium text-coral' : 'text-paper-muted'}>{contadorLikes}</span>
          </button>

          <button
            onClick={toggleComentarios}
            aria-expanded={comentariosAbiertos}
            aria-label="Comentarios"
            className={`flex h-11 items-center gap-1.5 pr-3 text-sm transition-colors sm:h-8 ${
              comentariosAbiertos ? 'font-medium text-teal' : 'text-paper-muted hover:text-paper'
            }`}
          >
            <span aria-hidden>💬</span>
            <span>{contadorComentarios}</span>
          </button>

          <button
            onClick={descargar}
            disabled={descargando}
            title="Descargar con marca de agua"
            aria-label="Descargar con marca de agua"
            className="flex h-11 items-center gap-1 text-sm text-paper-muted transition-colors hover:text-paper disabled:opacity-60 sm:h-8"
          >
            <span aria-hidden>{descargando ? '…' : '⬇'}</span>
          </button>
        </div>

        <button
          onClick={toggleIa}
          aria-expanded={iaAbierta}
          aria-label="Análisis con IA"
          className={`flex h-11 items-center gap-1 text-xs font-semibold text-teal transition-opacity sm:h-8 ${iaAbierta ? '' : 'opacity-80 hover:opacity-100'}`}
        >
          ✦ IA
        </button>
      </div>

      <AnimatePresence>
        {comentariosAbiertos && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden border-t border-paper/10 pt-3"
          >
            <p className="label mb-2">Comentarios en tiempo real ({contadorComentarios})</p>

            {cargandoComentarios ? (
              <Skeleton filas={2} claseFila="h-12" />
            ) : comentarios.length === 0 ? (
              <p className="py-2 text-xs italic text-paper-dim">Aún no hay comentarios. ¡Sé el primero en opinar!</p>
            ) : (
              <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                {comentarios.map((c) => {
                  const esAutorComentario = sesion?.usuarioId === c.autorId;
                  const puedeEliminar = esAutorComentario || esAutor;
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-2 rounded-xl bg-paper/5 p-2.5 text-xs">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-paper">{c.autorNombre}</span>
                          <span className="text-[10px] text-paper-dim">
                            {formatDistanceToNow(new Date(c.creadoEn), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-paper-muted">{c.contenido}</p>
                      </div>
                      {puedeEliminar && (
                        <button
                          onClick={() => borrarComentario(c.id)}
                          title="Eliminar comentario"
                          className="text-paper-dim transition-colors hover:text-coral"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={enviarComentario} className="mt-3 flex gap-2">
              <input
                type="text"
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                placeholder="Escribe un comentario respetuoso…"
                maxLength={500}
                className="input flex-1 py-1.5 text-xs"
              />
              <Button type="submit" className="px-3 py-1.5 text-xs" disabled={enviandoComentario || !nuevoComentario.trim()}>
                {enviandoComentario ? '…' : 'Enviar'}
              </Button>
            </form>
            {errorComentario && <p className="mt-1 text-xs text-coral">{errorComentario}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {iaAbierta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden rounded-xl border border-paper/10 bg-paper/5 p-3 text-xs"
          >
            <p className="border-b border-paper/10 pb-2 font-display text-sm font-semibold text-teal">✦ Análisis técnico de la obra</p>

            {cargandoIa ? (
              <div className="flex items-center justify-center gap-2 py-6 text-center text-paper-muted">
                <span className="punto-vivo" aria-hidden />
                Analizando composición, luces y técnica con visión artificial…
              </div>
            ) : analisisIa ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-paper/5 p-2.5">
                  <span className="font-medium text-paper">Puntaje Pedagógico Estimado:</span>
                  <span className="font-display text-base font-semibold text-teal">{analisisIa.scoreEstimado}/100</span>
                </div>

                {analisisIa.puntosFuertes?.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-teal">✓ Puntos Fuertes:</p>
                    <ul className="list-inside list-disc space-y-0.5 text-paper-muted">
                      {analisisIa.puntosFuertes.map((pf, idx) => (
                        <li key={idx}>{pf}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analisisIa.areasMejora?.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-coral-light">⚠ Áreas a Pulir:</p>
                    <ul className="list-inside list-disc space-y-0.5 text-paper-muted">
                      {analisisIa.areasMejora.map((am, idx) => (
                        <li key={idx}>{am}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analisisIa.consejos?.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-violet">💡 Consejos Técnicos:</p>
                    <ul className="list-inside list-disc space-y-0.5 text-paper-muted">
                      {analisisIa.consejos.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button onClick={pedirAnalisisIa} disabled={cargandoIa} className="text-[11px] text-teal hover:underline">
                    Re-analizar obra con IA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-4 text-center">
                <p className="text-paper-muted">Esta obra aún no ha sido analizada por la IA.</p>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={pedirAnalisisIa}>
                  ✦ Generar análisis técnico ahora
                </Button>
              </div>
            )}

            {errorIa && <p className="mt-2 text-xs text-coral">{errorIa}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const modalReporte = reportando && (
    <ModalReportar
      publicacionId={pub.id}
      onCerrar={() => setReportando(false)}
      onReportada={() => {
        setReportando(false);
        setReportada(true);
      }}
    />
  );

  if (detalle) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card card-fija overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        {visorDetalle}
        <div className="lg:max-h-[85vh] lg:overflow-y-auto">
          {cabecera}
          {avisos}
          {cuerpo}
        </div>
        {modalReporte}
      </motion.article>
    );
  }

  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden p-0">
      {cabecera}
      {avisos}
      {imagenTarjeta}
      {miniaturasProceso}
      {cuerpo}
      {modalReporte}
    </motion.article>
  );
}

interface OpcionMenu {
  texto: string;
  accion: () => void;
  peligro?: boolean;
  desactivada?: boolean;
}

function MenuObra({ opciones }: { opciones: OpcionMenu[] }) {
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
        aria-label="Más opciones"
        className="grid h-11 w-11 place-items-center rounded-full text-paper-muted hover:bg-paper/10 hover:text-paper sm:h-7 sm:w-7"
      >
        ⋯
      </button>
      {abierto && (
        <div className="panel-flotante absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden py-1">
          {opciones.map((o) => (
            <button
              key={o.texto}
              type="button"
              disabled={o.desactivada}
              onClick={() => {
                cerrar();
                o.accion();
              }}
              className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-paper/10 disabled:opacity-50 ${o.peligro ? 'text-coral-light' : 'text-paper'}`}
            >
              {o.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
