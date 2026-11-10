import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

interface Props {
  etiqueta: string;
  onCerrar: () => void;
  children: ReactNode;
}

/** Panel de vidrio que entra desde la derecha; en celular es una hoja inferior. */
export function PanelLateral({ etiqueta, onCerrar, children }: Props) {
  return createPortal(
    <div className="scrim fixed inset-0 z-50" onClick={onCerrar}>
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl p-6 sm:inset-y-0 sm:left-auto sm:max-h-none sm:w-[440px] sm:rounded-l-2xl sm:rounded-tr-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.aside>
    </div>,
    document.body,
  );
}
