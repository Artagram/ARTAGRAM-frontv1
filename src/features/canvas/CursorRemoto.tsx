interface Props {
  x: number;
  y: number;
  colorHex: string;
  nombre: string;
  detalle: string;
  esBorrador?: boolean;
}

/** El color es del usuario, así que el texto se elige según lo claro que sea. */
function textoLegible(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1B1626' : '#F5F1EA';
}

/** Flecha triangular con la punta en la coordenada del trazo y etiqueta en píldora. */
export function CursorRemoto({ x, y, colorHex, nombre, detalle, esBorrador }: Props) {
  const fondo = esBorrador ? '#1B1626' : colorHex;
  return (
    <div
      className="absolute flex select-none items-start transition-all duration-75 ease-out"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="flex-shrink-0">
        <path d="M1 1 13 6 7.5 7.5 6 13Z" fill={fondo} stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span
        className="mt-2.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold shadow"
        style={{ backgroundColor: fondo, color: textoLegible(fondo) }}
      >
        {esBorrador && '🧹 '}
        {nombre} <span className="font-normal opacity-80">· {detalle}</span>
      </span>
    </div>
  );
}
