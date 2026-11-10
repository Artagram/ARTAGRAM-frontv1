interface Props {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  onCambio: (valor: number) => void;
}

const CLASE_BOTON =
  'btn-tertiary h-11 w-11 flex-shrink-0 px-0 text-lg sm:h-9 sm:w-9';

export function Stepper({ etiqueta, valor, min, max, paso = 1, onCambio }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label">{etiqueta}</span>
      <div role="group" aria-label={etiqueta} className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={CLASE_BOTON}
          aria-label={`Reducir ${etiqueta}`}
          disabled={valor <= min}
          onClick={() => onCambio(Math.max(min, valor - paso))}
        >
          −
        </button>
        <output className="font-display text-xl font-semibold tabular-nums">{valor}</output>
        <button
          type="button"
          className={CLASE_BOTON}
          aria-label={`Aumentar ${etiqueta}`}
          disabled={valor >= max}
          onClick={() => onCambio(Math.min(max, valor + paso))}
        >
          +
        </button>
      </div>
    </div>
  );
}
