import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { INTERVALO_EN_VIVO_MS, cargarArtistasEnVivo, destinoArtista, textoActividad, type ArtistaEnVivo } from './enVivoApi';

const MINIMO_CARRUSEL = 6;
/** El trazo del mouse se mantiene con color este tiempo y luego se borra en DURACION_BORRADO. */
const DURACION_COLOR = 1000;
const DURACION_BORRADO = 700;

export function DibujandoAhora() {
  const [artistas, setArtistas] = useState<ArtistaEnVivo[]>([]);

  useEffect(() => {
    let vigente = true;
    const actualizar = () => {
      if (document.hidden) return;
      cargarArtistasEnVivo()
        .then((lista) => vigente && setArtistas(lista))
        .catch(() => undefined);
    };
    actualizar();
    const intervalo = setInterval(actualizar, INTERVALO_EN_VIVO_MS);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      vigente = false;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, []);

  if (artistas.length === 0) return null;

  // Con pocos artistas la pista no llena el ancho y el bucle dejaría huecos.
  const enCarrusel = artistas.length >= MINIMO_CARRUSEL;

  return (
    <section aria-label="Artistas dibujando ahora" className="card card-fija mb-5 p-3.5">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium text-paper-muted">
        <span className="punto-vivo" aria-hidden />
        Dibujando ahora
      </p>
      <div className={enCarrusel ? 'carrusel' : 'overflow-x-auto'}>
        <div className={enCarrusel ? 'carrusel-pista' : 'flex'}>
          {artistas.map((a) => (
            <TarjetaArtista key={a.usuarioId} artista={a} />
          ))}
          {enCarrusel && artistas.map((a) => <TarjetaArtista key={`copia-${a.usuarioId}`} artista={a} copia />)}
        </div>
      </div>
    </section>
  );
}

/** Hash estable del nombre: da a cada artista su boceto y su tono de color. */
function semilla(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Boceto decorativo del mini lienzo; no es la obra real, solo sugiere que hay algo en curso. */
function boceto(nombre: string) {
  const s = semilla(nombre);
  const y = (corrimiento: number) => 16 + ((s >>> corrimiento) & 31);
  return `M10 ${y(0)} C 34 ${y(5)}, 52 ${y(10)}, 70 ${y(5)} S 98 ${y(15)}, 104 ${y(10)}`;
}

function TarjetaArtista({ artista: a, copia }: { artista: ArtistaEnVivo; copia?: boolean }) {
  return (
    <Link
      to={destinoArtista(a)}
      aria-hidden={copia}
      tabIndex={copia ? -1 : undefined}
      className="group flex w-32 flex-shrink-0 flex-col pr-3"
    >
      <span className="aro-vivo relative block h-[72px] w-full rounded-xl">
        <MiniLienzo nombre={a.nombreArtista} />
        <span className="absolute -bottom-2 left-2">
          {a.fotoUrl ? (
            <img src={a.fotoUrl} alt="" className="h-6 w-6 rounded-full border-2 border-ink-800 object-cover" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-ink-800 bg-ink-600 text-[9px] font-semibold uppercase">
              {a.nombreArtista.slice(0, 2)}
            </span>
          )}
        </span>
      </span>
      <span className="mt-3 w-full truncate text-xs font-medium text-paper group-hover:text-coral">{a.nombreArtista}</span>
      <span className="w-full truncate text-[10px] text-paper-dim">{textoActividad(a)}</span>
    </Link>
  );
}

interface Punto {
  x: number;
  y: number;
  t: number;
  /** El mouse salió y volvió a entrar: no unir con el punto anterior. */
  corte: boolean;
}

/** Al pasar el mouse deja un trazo de color que dura un segundo y luego se borra. */
function MiniLienzo({ nombre }: { nombre: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const puntos = useRef<Punto[]>([]);
  const cuadro = useRef<number | null>(null);
  const cortar = useRef(true);
  const tono = semilla(nombre) % 360;

  useEffect(
    () => () => {
      if (cuadro.current !== null) cancelAnimationFrame(cuadro.current);
    },
    [],
  );

  function dibujar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      cuadro.current = null;
      return;
    }
    const ahora = performance.now();
    const vivos = puntos.current.filter((p) => ahora - p.t < DURACION_COLOR + DURACION_BORRADO);
    puntos.current = vivos;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5 * (window.devicePixelRatio || 1);
    for (let i = 1; i < vivos.length; i++) {
      const b = vivos[i];
      if (b.corte) continue;
      const a = vivos[i - 1];
      const edad = ahora - b.t;
      const alfa = edad < DURACION_COLOR ? 1 : Math.max(0, 1 - (edad - DURACION_COLOR) / DURACION_BORRADO);
      ctx.strokeStyle = `hsla(${(tono + b.t * 0.15) % 360}, 90%, 62%, ${alfa})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    cuadro.current = vivos.length > 0 ? requestAnimationFrame(dibujar) : null;
  }

  function alMover(e: PointerEvent<HTMLSpanElement>) {
    const canvas = canvasRef.current;
    if (!canvas || e.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const caja = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const ancho = Math.round(caja.width * dpr);
    const alto = Math.round(caja.height * dpr);
    if (canvas.width !== ancho || canvas.height !== alto) {
      canvas.width = ancho;
      canvas.height = alto;
    }
    puntos.current.push({
      x: (e.clientX - caja.left) * dpr,
      y: (e.clientY - caja.top) * dpr,
      t: performance.now(),
      corte: cortar.current,
    });
    cortar.current = false;
    if (cuadro.current === null) cuadro.current = requestAnimationFrame(dibujar);
  }

  return (
    <span
      className="relative block h-full w-full overflow-hidden rounded-[10px] bg-paper"
      onPointerMove={alMover}
      onPointerLeave={() => {
        cortar.current = true;
      }}
    >
      <svg viewBox="0 0 112 64" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={boceto(nombre)} fill="none" stroke="#1B1626" strokeOpacity="0.22" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
    </span>
  );
}
