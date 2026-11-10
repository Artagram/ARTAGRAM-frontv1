import clsx from 'clsx';

interface Props {
  filas?: number;
  className?: string;
  /** Clases de cada barra; por defecto, una tarjeta de 96px de alto. */
  claseFila?: string;
}

/** Estado de carga: tarjetas de vidrio con un brillo que las recorre. */
export function Skeleton({ filas = 3, className, claseFila = 'h-24' }: Props) {
  return (
    <div role="status" className={clsx('flex flex-col gap-3', className)}>
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} aria-hidden className={clsx('skeleton', claseFila)} />
      ))}
    </div>
  );
}
