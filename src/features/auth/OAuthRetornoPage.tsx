import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { useAuthStore, type SesionUsuario } from '../../lib/authStore';
import { FondoArtistico } from '../../components/layout/FondoArtistico';

const MENSAJES_ERROR: Record<string, string> = {
  ACCESO_DENEGADO: 'Cancelaste el acceso con Google.',
  CORREO_NO_VERIFICADO: 'Tu cuenta de Google no tiene el correo verificado.',
  ERROR_PROVEEDOR: 'Google no respondió bien. Intenta de nuevo en un momento.',
};

/**
 * Vuelta del login con Google: el backend redirige aquí con ?codigo= (o
 * ?error=) y el código se canjea por la misma sesión que da /api/auth/login.
 */
export function OAuthRetornoPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const [errorCanje, setErrorCanje] = useState<string | null>(null);
  // El código es de un solo uso: StrictMode monta dos veces en desarrollo y no debe canjearse dos veces
  const canjeado = useRef(false);

  const codigo = params.get('codigo');
  const errorUrl = params.get('error');
  const errorDeUrl = errorUrl
    ? (MENSAJES_ERROR[errorUrl] ?? 'No se pudo iniciar sesión con Google.')
    : !codigo
      ? 'Falta el código de acceso. Vuelve a intentarlo.'
      : null;
  const error = errorDeUrl ?? errorCanje;

  useEffect(() => {
    if (errorDeUrl || !codigo || canjeado.current) return;
    canjeado.current = true;
    api
      .post<SesionUsuario & { cuentaNueva?: boolean }>('/api/auth/oauth2/canjear', { codigo })
      .then(({ data }) => {
        const { cuentaNueva, ...sesion } = data;
        iniciarSesion(sesion);
        // Una cuenta recién creada tiene un nombre generado: se lleva al perfil para completarlo
        navigate(cuentaNueva ? `/perfil/${sesion.nombreArtista}` : '/feed', { replace: true });
      })
      .catch((err) => setErrorCanje(extraerMensajeError(err, 'El acceso venció. Vuelve a intentarlo.')));
  }, [codigo, errorDeUrl, iniciarSesion, navigate]);

  return (
    <FondoArtistico>
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-light flex w-full max-w-md flex-col items-center gap-3 p-8 text-center"
        >
          {error ? (
            <>
              <h1 className="font-display text-xl font-semibold text-ink-950">No pudimos iniciar sesión</h1>
              <p className="text-sm text-ink-950/65">{error}</p>
              <Link to="/login" className="btn-primary mt-2">
                Volver a intentarlo
              </Link>
            </>
          ) : (
            <>
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
              <p className="text-sm text-ink-950/65">Iniciando sesión con Google…</p>
            </>
          )}
        </motion.div>
      </div>
    </FondoArtistico>
  );
}
