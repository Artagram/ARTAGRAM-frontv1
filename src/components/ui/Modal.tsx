import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface Props {
  onCerrar?: () => void;
  etiquetadoPor?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Ventana modal de vidrio. Va en un portal porque `backdrop-filter` y `transform`
 * convierten a las tarjetas en contenedores de sus hijos `fixed`.
 * En celular ocupa toda la pantalla.
 */
export function Modal({ onCerrar, etiquetadoPor, className, children }: Props) {
  return createPortal(
    <div className="scrim fixed inset-0 z-50 grid place-items-center overflow-y-auto sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={etiquetadoPor}
        className={clsx('glass min-h-screen w-full p-6 sm:min-h-0 sm:max-w-md sm:rounded-2xl', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
