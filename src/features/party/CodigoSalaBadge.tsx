import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * El codigo de invitacion tiene que quedar siempre visible y facil de copiar:
 * es la unica forma que tienen los demas de unirse a esta sala, y antes vivia
 * escondido como texto chiquito junto al titulo (facil de no ver).
 */
export function CodigoSalaBadge({ codigo, compacto }: { codigo: string; compacto?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el codigo ya esta visible para copiarlo a mano.
    }
  }

  if (compacto) {
    return (
      <button type="button" onClick={copiar} title="Copiar código" className="chip min-h-11 font-mono font-semibold tracking-[0.2em] text-paper sm:min-h-0">
        {codigo}
        <span className="font-sans tracking-normal text-paper-muted">{copiado ? '¡Copiado!' : '⧉'}</span>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={copiar}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass flex items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-colors hover:border-paper/25"
      title="Copiar código"
    >
      <div>
        <p className="label">Código de la sala · compártelo para que se unan</p>
        <p className="font-mono text-2xl font-semibold tracking-[0.3em] text-paper">{codigo}</p>
      </div>
      <span className="ml-auto whitespace-nowrap text-xs font-medium text-teal">{copiado ? '¡Copiado!' : 'Copiar ⧉'}</span>
    </motion.button>
  );
}
