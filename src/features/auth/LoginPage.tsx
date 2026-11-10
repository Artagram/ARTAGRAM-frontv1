import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import {
  completarRegistro,
  ingresarConGoogle,
  limpiarNombreArtista,
  NOMBRE_MIN,
  type DisponibilidadNombre,
} from './googleAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const avisoExpirada = useAuthStore((s) => s.sesionExpirada);
  const limpiarAvisoSesionExpirada = useAuthStore((s) => s.limpiarAvisoSesionExpirada);
  const [error, setError] = useState<string | null>(null);
  // Con un ID token guardado, la cuenta es nueva y falta elegir el nombre.
  const [idTokenPendiente, setIdTokenPendiente] = useState<string | null>(null);
  const [nombreSugerido, setNombreSugerido] = useState('');

  // Se apaga sola al salir de /login: si el usuario vuelve mas tarde sin
  // haber sido redirigido por una sesion vencida, no deberia ver el aviso.
  useEffect(() => () => limpiarAvisoSesionExpirada(), [limpiarAvisoSesionExpirada]);

  async function alIngresar(idToken: string) {
    setError(null);
    try {
      const respuesta = await ingresarConGoogle(idToken);
      if (respuesta.sesion) {
        iniciarSesion(respuesta.sesion);
        navigate('/feed');
        return;
      }
      setNombreSugerido(respuesta.nombreSugerido ?? '');
      setIdTokenPendiente(idToken);
    } catch (err) {
      setError(extraerMensajeError(err, 'No pudimos iniciar sesión con Google'));
    }
  }

  return (
      <div className="flex min-h-[calc(100vh-var(--alto-barra))] items-center justify-center px-4 py-12">
        {idTokenPendiente ? (
          <ElegirNombre
            idToken={idTokenPendiente}
            nombreInicial={nombreSugerido}
            alCompletar={(sesion) => {
              iniciarSesion(sesion);
              navigate('/feed');
            }}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex w-full max-w-md flex-col gap-4 p-8"
          >
            <div>
              <h1 className="font-display text-2xl font-semibold">Bienvenido a Artagram</h1>
              <p className="mt-1 text-sm text-paper-muted">Entra con tu cuenta de Google para dibujar con tu comunidad.</p>
            </div>

            {avisoExpirada && (
              <p className="rounded-lg bg-violet/10 px-3 py-2 text-sm text-paper">
                Tu sesión expiró, inicia sesión de nuevo.
              </p>
            )}

            <div className="flex justify-center">
              <GoogleLogin
                text="continue_with"
                theme="filled_black"
                onSuccess={(r) => {
                  if (r.credential) {
                    void alIngresar(r.credential);
                  }
                }}
                onError={() => setError('No pudimos iniciar sesión con Google')}
              />
            </div>

            {error && <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}
          </motion.div>
        )}
      </div>
  );
}

function ElegirNombre({
  idToken,
  nombreInicial,
  alCompletar,
}: {
  idToken: string;
  nombreInicial: string;
  alCompletar: (sesion: Awaited<ReturnType<typeof completarRegistro>>) => void;
}) {
  const [nombreArtista, setNombreArtista] = useState(nombreInicial);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadNombre | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (nombreArtista.trim().length < NOMBRE_MIN) {
      setDisponibilidad(null);
      return;
    }
    const controlador = new AbortController();
    const temporizador = setTimeout(() => {
      api
        .get('/api/auth/nombre-disponible', { params: { nombre: nombreArtista }, signal: controlador.signal })
        .then((r) => setDisponibilidad(r.data))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [nombreArtista]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      alCompletar(await completarRegistro(idToken, nombreArtista));
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={enviar}
      className="card flex w-full max-w-md flex-col gap-4 p-8"
    >
      <div>
        <h1 className="font-display text-2xl font-semibold">Elige tu nombre de artista</h1>
        <p className="mt-1 text-sm text-paper-muted">Así te verán los demás en Artagram.</p>
      </div>

      <div>
        <TextField
          label="Nombre de artista"
          required
          value={nombreArtista}
          onChange={(e) => setNombreArtista(limpiarNombreArtista(e.target.value))}
          error={disponibilidad?.disponible === false ? 'Ese nombre ya lo tiene otra persona' : undefined}
          placeholder="lienzo_azul"
        />
        {disponibilidad?.disponible === false && disponibilidad.sugerencias.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {disponibilidad.sugerencias.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setNombreArtista(s)}
                className="chip hover:border-violet hover:text-paper"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral-light">{error}</p>}

      <Button type="submit" cargando={enviando} disabled={disponibilidad?.disponible === false}>
        Crear cuenta
      </Button>
    </motion.form>
  );
}
