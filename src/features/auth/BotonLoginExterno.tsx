import { API_BASE_URL } from '../../lib/api';

/** Ruta del front a la que el backend devuelve el código de un solo uso. */
export const RUTA_RETORNO_OAUTH = '/login/oauth';

/**
 * Inicia el login con Google: es una navegación completa (no fetch) porque el
 * flujo OAuth pasa por las páginas de Google y vuelve por redirección. El
 * backend guarda el state y el retorno (ver contrato, sección 4).
 */
export function BotonLoginExterno({ texto = 'Continuar con Google' }: { texto?: string }) {
  const retorno = `${window.location.origin}${RUTA_RETORNO_OAUTH}`;
  const url = `${API_BASE_URL}/api/auth/oauth2/google/autorizar?retorno=${encodeURIComponent(retorno)}`;

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-ink-950/50">
        <span className="h-px flex-1 bg-ink-950/15" />o<span className="h-px flex-1 bg-ink-950/15" />
      </div>
      <a
        href={url}
        className="flex items-center justify-center gap-2 rounded-xl border border-ink-950/15 bg-white px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-ink-950/5"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-ink-950/20 text-xs font-bold" aria-hidden>
          G
        </span>
        {texto}
      </a>
    </>
  );
}
