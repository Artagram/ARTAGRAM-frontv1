import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type { TipoPincel } from '../../types';
import {
  COLORES_CLASICOS,
  COLORES_MATES,
  PINCELES,
  PRESETS_GROSOR,
  type Herramienta,
  type HerramientaFiesta,
} from './BrushToolbar';

export interface AccionRiel {
  id: string;
  icono: ReactNode;
  etiqueta: string;
  onClick: () => void;
  activo?: boolean;
}

export interface RielHerramientasProps {
  herramienta: Herramienta;
  onCambiar: (h: Herramienta) => void;
  deshabilitado?: boolean;
  modoFiesta?: boolean;
  herramientasTomadas?: Record<string, string>;
  usuarioActualNombre?: string;
  herramientaActivaFiesta?: HerramientaFiesta | null;
  onTomarHerramienta?: (h: HerramientaFiesta) => void;
  borradorActivo?: boolean;
  onBorrador?: () => void;
  acciones?: AccionRiel[];
  claveMemoria?: string;
  /** Estado abierto controlado opcional en móvil (<md). */
  abiertoMovil?: boolean;
  /** Callback para sincronizar cuando el riel se abre o se cierra en móvil. */
  onCambiarAbierto?: (abierto: boolean) => void;
}

const EVENTO_CERRAR_RIEL = 'artagram:cerrar-riel-dibujo';
const PRESETS_OPACIDAD = [25, 50, 75, 100];

/**
 * Función exportada para que las páginas con lienzo cierren el riel en móvil
 * y cualquier popover activo en cuanto el usuario empiece a trazar.
 */
export function cerrarRielAlDibujar(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_CERRAR_RIEL));
  }
}

function esPantallaMovil(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

function leerEstadoLocal(clave: string, valorPorDefecto: boolean): boolean {
  try {
    const guardado = window.localStorage.getItem(clave);
    if (guardado === '1' || guardado === 'true') return true;
    if (guardado === '0' || guardado === 'false') return false;
  } catch {
    // Si localStorage falla o está bloqueado, usar el valor por defecto
  }
  return valorPorDefecto;
}

function guardarEstadoLocal(clave: string, abierto: boolean): void {
  try {
    window.localStorage.setItem(clave, abierto ? '1' : '0');
  } catch {
    // Ignorar errores de almacenamiento
  }
}

export function RielHerramientas({
  herramienta,
  onCambiar,
  deshabilitado = false,
  modoFiesta = false,
  herramientasTomadas = {},
  usuarioActualNombre,
  herramientaActivaFiesta,
  onTomarHerramienta,
  borradorActivo,
  onBorrador,
  acciones,
  claveMemoria = 'lienzo',
  abiertoMovil,
  onCambiarAbierto,
}: RielHerramientasProps) {
  const claveStorageEscritorio = `artagram:riel:${claveMemoria}:md`;
  const claveStorageMovil = `artagram:riel:${claveMemoria}:movil`;

  const [esMovil, setEsMovil] = useState<boolean>(() => esPantallaMovil());
  // En escritorio (md+) es visible por defecto; lee preferencia previa desde localStorage
  const [abiertoEscritorio, setAbiertoEscritorio] = useState<boolean>(() =>
    leerEstadoLocal(claveStorageEscritorio, true),
  );
  // En móvil (<md) está OCULTO por defecto para dejar todo el lienzo despejado
  const [abiertoMovilInterno, setAbiertoMovilInterno] = useState<boolean>(false);

  const [popoverActivo, setPopoverActivo] = useState<'color' | 'trazo' | null>(null);
  const [categoriaColor, setCategoriaColor] = useState<'clasicos' | 'mates'>('clasicos');

  const raizRef = useRef<HTMLDivElement>(null);

  const abiertoMovilEfectivo = abiertoMovil !== undefined ? abiertoMovil : abiertoMovilInterno;
  const estaAbierto = esMovil ? abiertoMovilEfectivo : abiertoEscritorio;

  const actualizarAbiertoMovil = useCallback(
    (nuevo: boolean) => {
      setAbiertoMovilInterno(nuevo);
      guardarEstadoLocal(claveStorageMovil, nuevo);
      onCambiarAbierto?.(nuevo);
    },
    [claveStorageMovil, onCambiarAbierto],
  );

  const actualizarAbierto = useCallback(
    (nuevo: boolean) => {
      if (!nuevo) {
        setPopoverActivo(null);
      }
      if (esPantallaMovil()) {
        actualizarAbiertoMovil(nuevo);
      } else {
        setAbiertoEscritorio(nuevo);
        guardarEstadoLocal(claveStorageEscritorio, nuevo);
      }
    },
    [actualizarAbiertoMovil, claveStorageEscritorio],
  );

  // Detectar cambios de breakpoint (<md vs md+)
  useEffect(() => {
    function alRedimensionar() {
      const movilAhora = esPantallaMovil();
      setEsMovil(movilAhora);
    }
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);

  // Escuchar evento explícito de inicio de dibujo para cerrar popovers y ocultar el riel en móvil
  useEffect(() => {
    function alEmpezarDibujo() {
      setPopoverActivo(null);
      if (esPantallaMovil()) {
        actualizarAbiertoMovil(false);
      }
    }
    window.addEventListener(EVENTO_CERRAR_RIEL, alEmpezarDibujo);
    return () => window.removeEventListener(EVENTO_CERRAR_RIEL, alEmpezarDibujo);
  }, [actualizarAbiertoMovil]);

  // Cerrar popover al tocar fuera o con Escape; en móvil cerrar también el riel si se toca el canvas
  useEffect(() => {
    function alPresionarFuera(e: PointerEvent) {
      const nodo = raizRef.current;
      const objetivo = e.target as Node | null;
      if (!nodo || !objetivo || nodo.contains(objetivo)) return;

      if (popoverActivo !== null) {
        setPopoverActivo(null);
      }

      // Si el usuario empieza a dibujar directamente sobre un <canvas> en móvil, cerrar el riel
      if (objetivo instanceof HTMLCanvasElement && esPantallaMovil() && abiertoMovilEfectivo) {
        actualizarAbiertoMovil(false);
      }
    }

    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape' && popoverActivo !== null) {
        setPopoverActivo(null);
      }
    }

    document.addEventListener('pointerdown', alPresionarFuera);
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('pointerdown', alPresionarFuera);
      window.removeEventListener('keydown', alTeclear);
    };
  }, [popoverActivo, abiertoMovilEfectivo, actualizarAbiertoMovil]);

  const mostrarBorradorSimple = !modoFiesta && (onBorrador !== undefined || borradorActivo !== undefined);

  const listaHerramientasFiesta: { valor: HerramientaFiesta; etiqueta: string; icono: string; descripcion: string }[] = [
    ...PINCELES,
    { valor: 'BORRADOR', etiqueta: 'Borrador', icono: '🧹', descripcion: 'Borrador exclusivo para limpiar' },
  ];

  // Icono representativo de la herramienta activa para el botón colapsado
  const iconoHerramientaActual = (() => {
    if (modoFiesta) {
      if (herramientaActivaFiesta === 'BORRADOR') return '🧹';
      const encontrado = PINCELES.find((p) => p.valor === herramientaActivaFiesta);
      return encontrado?.icono ?? '🖌';
    }
    if (borradorActivo) return '🧹';
    const encontrado = PINCELES.find((p) => p.valor === herramienta.tipoPincel);
    return encontrado?.icono ?? '🖌';
  })();

  // Diámetro visual proporcional al grosor (entre 5px y 24px dentro del botón de 40px)
  const diametroMuestraGrosor = Math.max(5, Math.min(24, Math.round(4 + (herramienta.grosor / 64) * 20)));
  const opacidadPorcentaje = Math.round(herramienta.opacidad * 100);

  return (
    <div
      ref={raizRef}
      className={clsx(
        'pointer-events-none absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-30 flex items-center max-h-[calc(100%-16px)] select-none',
        deshabilitado && 'opacity-50',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!estaAbierto ? (
          /* Estado oculto/colapsado:
             - En móvil (<md): botón flotante redondo de 44px con icono de pincel y aro del color actual
             - En escritorio (md+): pestañita compacta con muestra de color y chevron para desplegar */
          <motion.button
            key="riel-colapsado"
            type="button"
            initial={{ opacity: 0, x: -10, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.92 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            disabled={deshabilitado}
            onClick={() => actualizarAbierto(true)}
            aria-label="Abrir herramientas de dibujo"
            aria-expanded={false}
            title="Mostrar herramientas de dibujo"
            className="pointer-events-auto card card-fija glass bg-ink-800/95 border border-paper/15 shadow-glow flex h-11 w-11 md:h-auto md:w-11 md:flex-col md:gap-1.5 md:py-2.5 items-center justify-center rounded-full md:rounded-2xl text-paper transition-transform active:scale-95"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-ink-900/80 text-base leading-none shadow-sm"
              style={{ borderColor: herramienta.colorHex }}
            >
              {iconoHerramientaActual}
            </span>
            <span aria-hidden className="hidden md:flex items-center justify-center text-paper-muted text-xs leading-none">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3.5L10.5 8L6 12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </motion.button>
        ) : (
          /* Riel lateral abierto (~56px de ancho = w-14) */
          <motion.div
            key="riel-abierto"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="toolbar"
            aria-label="Herramientas de dibujo"
            aria-orientation="vertical"
            className={clsx(
              'pointer-events-auto card card-fija glass bg-ink-800/95 border border-paper/10 shadow-glow flex w-14 max-h-full flex-col items-center gap-1 overflow-y-auto overflow-x-hidden rounded-2xl p-1.5',
              deshabilitado && 'pointer-events-none',
            )}
          >
            {/* 1. Botones de pincel (y borrador en modo fiesta o cuando se solicite) */}
            {modoFiesta ? (
              listaHerramientasFiesta.map((p) => {
                const dueno = herramientasTomadas[p.valor];
                const tomadoPorOtro = !!dueno && dueno !== usuarioActualNombre;
                const tomadoPorMi = herramientaActivaFiesta === p.valor;
                const inicialDueno = dueno ? dueno.trim().charAt(0).toUpperCase() : null;
                const descripcionEstado = tomadoPorOtro
                  ? `${p.etiqueta}: Tomado por ${dueno}`
                  : tomadoPorMi
                    ? `${p.etiqueta}: En uso por ti (${dueno ?? 'Tú'})`
                    : `${p.etiqueta}: Disponible para tomar`;

                return (
                  <button
                    key={p.valor}
                    type="button"
                    disabled={tomadoPorOtro}
                    aria-label={descripcionEstado}
                    aria-pressed={tomadoPorMi}
                    title={descripcionEstado}
                    onClick={() => onTomarHerramienta?.(p.valor)}
                    className={clsx(
                      'relative flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-xl border text-base transition-all',
                      tomadoPorMi
                        ? 'border-teal bg-teal/20 text-teal ring-2 ring-teal/30 shadow-sm'
                        : tomadoPorOtro
                          ? 'border-paper/10 bg-paper/5 text-paper-dim cursor-not-allowed opacity-55'
                          : 'border-paper/10 bg-paper/5 text-paper-muted hover:border-paper/35 hover:text-paper',
                    )}
                  >
                    <span aria-hidden className="leading-none">
                      {p.icono}
                    </span>
                    {dueno && inicialDueno && (
                      <span
                        aria-hidden
                        className={clsx(
                          'absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none shadow',
                          tomadoPorMi
                            ? 'bg-teal text-ink-950'
                            : 'border border-paper/20 bg-ink-600 text-paper',
                        )}
                      >
                        {inicialDueno}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <>
                {PINCELES.map((p) => {
                  const activo = !borradorActivo && herramienta.tipoPincel === p.valor;
                  const etiquetaBtn = `${p.etiqueta}: ${p.descripcion}`;
                  return (
                    <button
                      key={p.valor}
                      type="button"
                      aria-label={etiquetaBtn}
                      aria-pressed={activo}
                      title={etiquetaBtn}
                      onClick={() => onCambiar({ ...herramienta, tipoPincel: p.valor as TipoPincel })}
                      className={clsx(
                        'relative flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-xl border text-base transition-all',
                        activo
                          ? 'border-violet bg-violet/25 text-paper ring-2 ring-violet/30 shadow-sm'
                          : 'border-paper/10 bg-paper/5 text-paper-muted hover:border-paper/30 hover:text-paper',
                      )}
                    >
                      <span aria-hidden className="leading-none">
                        {p.icono}
                      </span>
                    </button>
                  );
                })}

                {mostrarBorradorSimple && (
                  <button
                    type="button"
                    aria-label={borradorActivo ? 'Borrador activo' : 'Borrador'}
                    aria-pressed={!!borradorActivo}
                    title={borradorActivo ? 'Borrador activo' : 'Borrador'}
                    onClick={() => onBorrador?.()}
                    className={clsx(
                      'relative flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-xl border text-base transition-all',
                      borradorActivo
                        ? 'border-coral bg-coral/25 text-paper ring-2 ring-coral/30 shadow-sm'
                        : 'border-paper/10 bg-paper/5 text-paper-muted hover:border-paper/30 hover:text-paper',
                    )}
                  >
                    <span aria-hidden className="leading-none">
                      🧹
                    </span>
                  </button>
                )}
              </>
            )}

            {/* Separador */}
            <div role="separator" className="my-0.5 h-px w-8 flex-shrink-0 bg-paper/10" />

            {/* 2. Botón con la muestra del color actual */}
            <button
              type="button"
              aria-label={`Color actual ${herramienta.colorHex}. Abrir paleta de colores`}
              aria-expanded={popoverActivo === 'color'}
              aria-haspopup="dialog"
              title={`Color: ${herramienta.colorHex}`}
              onClick={() => setPopoverActivo((actual) => (actual === 'color' ? null : 'color'))}
              className={clsx(
                'flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-xl border transition-all',
                popoverActivo === 'color'
                  ? 'border-violet bg-violet/20 ring-2 ring-violet/30'
                  : 'border-paper/10 bg-paper/5 hover:border-paper/30',
              )}
            >
              <span
                aria-hidden
                className="h-6 w-6 rounded-full border-2 border-paper shadow-sm"
                style={{ backgroundColor: herramienta.colorHex }}
              />
            </button>

            {/* 3. Botón de grosor y opacidad (círculo cuyo tamaño refleja el grosor) */}
            <button
              type="button"
              aria-label={`Grosor ${herramienta.grosor}px y opacidad ${opacidadPorcentaje}%. Abrir ajustes de trazo`}
              aria-expanded={popoverActivo === 'trazo'}
              aria-haspopup="dialog"
              title={`Grosor: ${herramienta.grosor}px · Opacidad: ${opacidadPorcentaje}%`}
              onClick={() => setPopoverActivo((actual) => (actual === 'trazo' ? null : 'trazo'))}
              className={clsx(
                'relative flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-xl border transition-all',
                popoverActivo === 'trazo'
                  ? 'border-coral bg-coral/20 ring-2 ring-coral/30'
                  : 'border-paper/10 bg-paper/5 hover:border-paper/30',
              )}
            >
              <span
                aria-hidden
                className="rounded-full border border-paper/50 transition-all"
                style={{
                  width: `${diametroMuestraGrosor}px`,
                  height: `${diametroMuestraGrosor}px`,
                  backgroundColor: herramienta.colorHex,
                  opacity: Math.max(0.25, herramienta.opacidad),
                }}
              />
              <span
                aria-hidden
                className="absolute bottom-0.5 right-1 font-mono text-[8px] leading-none text-paper-muted"
              >
                {herramienta.grosor}
              </span>
            </button>

            {/* Separador */}
            <div role="separator" className="my-0.5 h-px w-8 flex-shrink-0 bg-paper/10" />

            {/* 4. Acciones extra opcionales */}
            {acciones && acciones.length > 0 && (
              <>
                {acciones.map((accion) => (
                  <button
                    key={accion.id}
                    type="button"
                    aria-label={accion.etiqueta}
                    aria-pressed={accion.activo}
                    title={accion.etiqueta}
                    onClick={() => {
                      setPopoverActivo(null);
                      accion.onClick();
                    }}
                    className={clsx(
                      'flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition-all',
                      accion.activo
                        ? 'border-violet bg-violet/25 text-paper ring-2 ring-violet/30 shadow-sm'
                        : 'border-paper/10 bg-paper/5 text-paper-muted hover:border-paper/30 hover:text-paper',
                    )}
                  >
                    {accion.icono}
                  </button>
                ))}
                <div role="separator" className="my-0.5 h-px w-8 flex-shrink-0 bg-paper/10" />
              </>
            )}

            {/* 5. Botón chevron al final para ocultar el riel */}
            <button
              type="button"
              aria-label="Ocultar riel de herramientas"
              title="Ocultar riel de herramientas"
              onClick={() => actualizarAbierto(false)}
              className="flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-xl border border-transparent text-paper-muted transition-colors hover:border-paper/15 hover:bg-paper/5 hover:text-paper"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M10 3.5L5.5 8L10 12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popovers flotantes al lado derecho del riel (nunca dentro del scroll del riel) */}
      <AnimatePresence>
        {estaAbierto && popoverActivo === 'color' && (
          <motion.div
            key="popover-color"
            role="dialog"
            aria-label="Paleta de colores"
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pointer-events-auto panel-flotante ml-2.5 w-64 max-w-[calc(100vw-80px)] max-h-full overflow-y-auto p-3.5 text-paper"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="label">Paleta de color</span>
              <span className="font-mono text-[11px] text-paper-muted uppercase">{herramienta.colorHex}</span>
            </div>

            {/* Pestañas Clásicos / Mates */}
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-ink-800/80 p-1 border border-paper/10">
              <button
                type="button"
                aria-pressed={categoriaColor === 'clasicos'}
                onClick={() => setCategoriaColor('clasicos')}
                className={clsx(
                  'rounded-lg py-1.5 text-xs font-semibold transition-colors',
                  categoriaColor === 'clasicos'
                    ? 'bg-violet/25 text-paper border border-violet/40'
                    : 'text-paper-dim hover:text-paper',
                )}
              >
                Clásicos
              </button>
              <button
                type="button"
                aria-pressed={categoriaColor === 'mates'}
                onClick={() => setCategoriaColor('mates')}
                className={clsx(
                  'rounded-lg py-1.5 text-xs font-semibold transition-colors',
                  categoriaColor === 'mates'
                    ? 'bg-amber/25 text-amber border border-amber/40'
                    : 'text-paper-dim hover:text-paper',
                )}
              >
                Mates
              </button>
            </div>

            {/* Muestras de color */}
            <div className="grid grid-cols-4 gap-2 place-items-center">
              {(categoriaColor === 'clasicos' ? COLORES_CLASICOS : COLORES_MATES).map((c) => {
                const seleccionado = herramienta.colorHex.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={seleccionado}
                    title={`Color ${c}`}
                    onClick={() => onCambiar({ ...herramienta, colorHex: c })}
                    className={clsx(
                      'h-10 w-10 min-h-[40px] min-w-[40px] rounded-full border-2 transition-transform hover:scale-105',
                      seleccionado
                        ? 'border-paper scale-105 ring-2 ring-violet/60 shadow-sm'
                        : 'border-paper/15 hover:border-paper/50',
                    )}
                    style={{ backgroundColor: c }}
                  />
                );
              })}

              {/* Selector nativo input type="color" */}
              <label
                className="relative flex h-10 w-10 min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-paper/35 transition-transform hover:scale-105 hover:border-paper"
                title="Elegir color personalizado"
                style={{ backgroundColor: herramienta.colorHex }}
              >
                <span aria-hidden className="text-xs drop-shadow-md select-none">
                  🎨
                </span>
                <input
                  type="color"
                  aria-label="Color personalizado"
                  value={herramienta.colorHex}
                  onChange={(e) => onCambiar({ ...herramienta, colorHex: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </motion.div>
        )}

        {estaAbierto && popoverActivo === 'trazo' && (
          <motion.div
            key="popover-trazo"
            role="dialog"
            aria-label="Ajustes de grosor y opacidad"
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pointer-events-auto panel-flotante ml-2.5 w-64 max-w-[calc(100vw-80px)] max-h-full overflow-y-auto p-3.5 text-paper space-y-3.5"
          >
            {/* Slider y presets de Grosor */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Grosor</span>
                <span className="font-mono text-xs text-paper">{herramienta.grosor}px</span>
              </div>
              <input
                type="range"
                aria-label="Grosor"
                min={1}
                max={64}
                value={herramienta.grosor}
                onChange={(e) => onCambiar({ ...herramienta, grosor: Number(e.target.value) })}
                className="w-full cursor-pointer accent-coral"
              />
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {PRESETS_GROSOR.map((tam) => {
                  const activo = herramienta.grosor === tam;
                  return (
                    <button
                      key={tam}
                      type="button"
                      aria-label={`Preset de grosor ${tam} píxeles`}
                      aria-pressed={activo}
                      onClick={() => onCambiar({ ...herramienta, grosor: tam })}
                      className={clsx(
                        'min-h-[36px] rounded-xl border py-1 text-xs font-mono transition-colors',
                        activo
                          ? 'border-coral bg-coral/20 text-coral-light font-semibold'
                          : 'border-paper/10 bg-paper/5 text-paper-muted hover:border-paper/30 hover:text-paper',
                      )}
                    >
                      {tam}px
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider y presets de Opacidad */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Opacidad</span>
                <span className="font-mono text-xs text-paper">{opacidadPorcentaje}%</span>
              </div>
              <input
                type="range"
                aria-label="Opacidad"
                min={5}
                max={100}
                value={opacidadPorcentaje}
                onChange={(e) => onCambiar({ ...herramienta, opacidad: Number(e.target.value) / 100 })}
                className="w-full cursor-pointer accent-coral"
              />
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {PRESETS_OPACIDAD.map((porcentaje) => {
                  const activo = opacidadPorcentaje === porcentaje;
                  return (
                    <button
                      key={porcentaje}
                      type="button"
                      aria-label={`Opacidad ${porcentaje} por ciento`}
                      aria-pressed={activo}
                      onClick={() => onCambiar({ ...herramienta, opacidad: porcentaje / 100 })}
                      className={clsx(
                        'min-h-[36px] rounded-xl border py-1 text-xs font-mono transition-colors',
                        activo
                          ? 'border-coral bg-coral/20 text-coral-light font-semibold'
                          : 'border-paper/10 bg-paper/5 text-paper-muted hover:border-paper/30 hover:text-paper',
                      )}
                    >
                      {porcentaje}%
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
