import { type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';

interface Ambiente {
  colores: [string, string, string];
  opacidades?: [number, number, number];
  rapido?: boolean;
}

const CORAL = '#FF6B57';
const TURQUESA = '#2FD9C4';
const VIOLETA = '#8B5CF6';
const AMBAR = '#FFC24B';

const OPACIDADES_NORMALES: [number, number, number] = [0.45, 0.35, 0.28];
const OPACIDADES_APAGADAS: [number, number, number] = [0.15, 0.15, 0.15];

const LIENZO = /^\/comunidades\/[^/]+\/lienzo/;

/** Color dominante de cada pantalla; null cuando el lienzo la cubre por completo. */
export function ambienteDeRuta(ruta: string): Ambiente | null {
  if (LIENZO.test(ruta)) return null;
  if (/^\/(feed|mensajes|notificaciones|obra)/.test(ruta)) return { colores: [VIOLETA, VIOLETA, CORAL] };
  if (ruta.startsWith('/comunidades')) return { colores: [TURQUESA, TURQUESA, VIOLETA] };
  if (ruta.startsWith('/fiesta')) return { colores: [CORAL, AMBAR, CORAL], rapido: true };
  if (/^\/(planes|suscripcion)/.test(ruta)) return { colores: [AMBAR, VIOLETA, AMBAR] };
  if (ruta.startsWith('/admin')) return { colores: [VIOLETA, TURQUESA, VIOLETA], opacidades: OPACIDADES_APAGADAS };
  return { colores: [CORAL, VIOLETA, TURQUESA] };
}

/**
 * Fondo de toda la app. Vive en AppShell, fuera de la transición de rutas, para
 * que las manchas no se reinicien al navegar: solo cambian de color.
 */
export function FondoVivo() {
  const { pathname } = useLocation();
  const ambiente = ambienteDeRuta(pathname);
  if (!ambiente) return null;

  const opacidades = ambiente.opacidades ?? OPACIDADES_NORMALES;
  const duraciones = ambiente.rapido
    ? { '--mancha-1': '8s', '--mancha-2': '9s', '--mancha-3': '8.5s' }
    : { '--mancha-1': '14s', '--mancha-2': '18s', '--mancha-3': '16s' };

  return (
    <div aria-hidden className="manchas" style={duraciones as CSSProperties}>
      {ambiente.colores.map((color, i) => (
        <span key={i} className={`mancha mancha-${i + 1}`} style={{ backgroundColor: color, opacity: opacidades[i] }} />
      ))}
    </div>
  );
}
