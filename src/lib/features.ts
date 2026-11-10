/**
 * Funciones cuyo front ya está hecho pero que dependen de endpoints que el
 * backend todavía no tiene (contrato en docs/CONTRATO_FUNCIONES_PENDIENTES.md).
 * Quedan apagadas hasta que el backend exista, para no mostrar botones que fallan.
 *
 * Se encienden con VITE_FEATURE_<NOMBRE>=true en el .env, o en caliente para
 * probar con: localStorage.setItem('artagram.features', '{"reportes":true}')
 */
export type Funcion = 'reportes' | 'presencia' | 'comunidadesRecomendadas' | 'loginExterno';

const VARIABLE_ENV: Record<Funcion, string> = {
  reportes: 'VITE_FEATURE_REPORTES',
  presencia: 'VITE_FEATURE_PRESENCIA',
  comunidadesRecomendadas: 'VITE_FEATURE_COMUNIDADES_RECOMENDADAS',
  loginExterno: 'VITE_FEATURE_LOGIN_EXTERNO',
};

const CLAVE_STORAGE = 'artagram.features';

function leerOverrides(): Partial<Record<Funcion, boolean>> {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    return crudo ? (JSON.parse(crudo) as Partial<Record<Funcion, boolean>>) : {};
  } catch {
    return {};
  }
}

export function funcionActiva(funcion: Funcion): boolean {
  const override = leerOverrides()[funcion];
  if (typeof override === 'boolean') return override;
  return import.meta.env[VARIABLE_ENV[funcion]] === 'true';
}
