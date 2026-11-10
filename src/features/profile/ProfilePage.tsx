import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { BotonSeguir } from '../feed/BotonSeguir';
import { ObrasPerfil } from './ObrasPerfil';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { TextField } from '../../components/ui/TextField';
import type { PerfilResponse, Seguimiento } from '../../types';

interface EnlaceForm {
  etiqueta: string;
  url: string;
}

export function ProfilePage() {
  const { nombreArtista } = useParams<{ nombreArtista: string }>();
  const sesion = useAuthStore((s) => s.sesion);
  const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const [biografia, setBiografia] = useState('');
  const [enlaces, setEnlaces] = useState<EnlaceForm[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  // Se guarda junto al id del perfil: al navegar a otro perfil no se muestra el estado del anterior
  const [seguimientoDe, setSeguimientoDe] = useState<{ usuarioId: string; datos: Seguimiento } | null>(null);

  useEffect(() => {
    if (!nombreArtista) return;
    setCargando(true);
    api
      .get<PerfilResponse>(`/api/perfiles/${nombreArtista}`)
      .then((r) => {
        setPerfil(r.data);
        setBiografia(r.data.biografia ?? '');
        setEnlaces(r.data.enlaces.map((e) => ({ etiqueta: e.etiqueta, url: e.url })));
      })
      .catch((err) => setError(extraerMensajeError(err, 'No encontramos a ese artista')))
      .finally(() => setCargando(false));
  }, [nombreArtista]);

  // Estado del boton Seguir: solo con sesion y en perfiles ajenos (el perfil es publico)
  const usuarioIdPerfil = perfil && !perfil.esPropio ? perfil.usuarioId : null;
  useEffect(() => {
    if (!usuarioIdPerfil || !sesion) return;
    api
      .get<Seguimiento>(`/api/artistas/${usuarioIdPerfil}`)
      .then((r) => setSeguimientoDe({ usuarioId: usuarioIdPerfil, datos: r.data }))
      .catch(() => {});
  }, [usuarioIdPerfil, sesion]);
  const seguimiento = sesion && seguimientoDe?.usuarioId === usuarioIdPerfil ? seguimientoDe.datos : null;

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data } = await api.post<{ fotoUrl: string }>('/api/perfil/me/foto', form);
      setPerfil((p) => (p ? { ...p, fotoUrl: data.fotoUrl } : p));
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const { data } = await api.put<PerfilResponse>('/api/perfil/me', {
        biografia,
        enlaces: enlaces.filter((e) => e.etiqueta.trim() && e.url.trim()),
      });
      setPerfil(data);
      setEditando(false);
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <Skeleton filas={2} className="mx-auto max-w-3xl px-4 py-10" claseFila="h-56" />;
  }
  if (error && !perfil) {
    return <p className="banner-error mx-auto my-16 max-w-xl text-center">{error}</p>;
  }
  if (!perfil) return null;

  const esPropio = perfil.esPropio && sesion;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-fija overflow-hidden">
        <div className="relative h-28 bg-gradient-to-br from-coral/40 via-violet/30 to-teal/30">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-700/70 to-transparent" />
        </div>
        <div className="px-6 pb-6">
          <div className="relative -mt-9 flex items-end justify-between">
            <div className="relative">
              <div
                className={`grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-ink-600 text-xl font-semibold uppercase ${
                  perfil.premium || (esPropio && sesion?.premium) ? 'shadow-[0_0_0_2px_#1B1626,0_0_0_4px_#FFC24B]' : 'shadow-[0_0_0_2px_#1B1626]'
                }`}
              >
                {perfil.fotoUrl ? <img src={perfil.fotoUrl} alt={perfil.nombreArtista} className="h-full w-full object-cover" /> : perfil.nombreArtista.slice(0, 2)}
              </div>
              {esPropio && (
                <label className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-coral text-xs text-ink-800 shadow-glow-coral">
                  {subiendoFoto ? '…' : '✎'}
                  <input type="file" accept="image/*" className="hidden" onChange={subirFoto} />
                </label>
              )}
            </div>
            {esPropio && !editando && (
              <Button variant="secondary" onClick={() => setEditando(true)}>
                Editar perfil
              </Button>
            )}
            {!esPropio && seguimiento && (
              <BotonSeguir
                usuarioId={perfil.usuarioId}
                loSigo={seguimiento.loSigo}
                onCambio={(loSigo) =>
                  setSeguimientoDe((s) =>
                    s ? { ...s, datos: { loSigo, seguidores: Math.max(0, s.datos.seguidores + (loSigo ? 1 : -1)) } } : s,
                  )
                }
              />
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <h1 className="font-display text-[32px] font-semibold leading-tight">{perfil.nombreArtista}</h1>
            {seguimiento && (
              <span className="text-sm text-paper-muted">
                {seguimiento.seguidores} {seguimiento.seguidores === 1 ? 'seguidor' : 'seguidores'}
              </span>
            )}
            {(perfil.premium || (esPropio && sesion?.premium)) && (
              <span className="insignia-pro">PRO</span>
            )}
          </div>

          {!editando ? (
            <>
              <p className="mt-2 whitespace-pre-line text-sm text-paper-muted">{perfil.biografia || 'Sin biografía todavía.'}</p>
              {perfil.enlaces.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {perfil.enlaces.map((e, i) => (
                    <a key={i} href={e.url} target="_blank" rel="noreferrer" className="chip text-xs hover:border-teal/40 hover:text-teal">
                      {e.etiqueta} ↗
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 flex flex-col gap-5">
              <div>
                <p className="label mb-1.5">Biografía</p>
                <textarea
                  className="input min-h-[90px] resize-y"
                  maxLength={500}
                  value={biografia}
                  onChange={(e) => setBiografia(e.target.value)}
                  placeholder="Contales a los demás qué haces…"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="label">Enlaces (máx. 5)</p>
                  {enlaces.length < 5 && (
                    <button
                      type="button"
                      className="text-xs text-teal hover:underline"
                      onClick={() => setEnlaces((prev) => [...prev, { etiqueta: '', url: '' }])}
                    >
                      + agregar
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {enlaces.map((en, i) => (
                    <div key={i} className="flex gap-2">
                      <TextField
                        placeholder="Instagram"
                        value={en.etiqueta}
                        onChange={(e) => setEnlaces((prev) => prev.map((x, j) => (j === i ? { ...x, etiqueta: e.target.value } : x)))}
                        className="w-32"
                      />
                      <TextField
                        placeholder="https://…"
                        value={en.url}
                        onChange={(e) => setEnlaces((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                        className="flex-1"
                      />
                      <button type="button" className="text-coral-light" onClick={() => setEnlaces((prev) => prev.filter((_, j) => j !== i))}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="banner-error">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
                <Button onClick={guardar} cargando={guardando}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}
          {!editando && <ObrasPerfil key={perfil.usuarioId} autorId={perfil.usuarioId} esPropio={Boolean(esPropio)} />}
        </div>
      </motion.div>
    </div>
  );
}
