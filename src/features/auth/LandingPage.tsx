import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function LandingPage() {
  return (
      <div className="relative overflow-hidden">
        <section className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-20 text-center sm:pt-28">
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chip mb-6 text-paper">
            El proceso importa tanto como la obra
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="max-w-3xl font-display text-[40px] font-semibold leading-none tracking-[-0.02em] sm:text-[54px]"
          >
            Dibuja con otros, <span className="acento">en vivo.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-xl text-paper-muted"
          >
            Publica tu obra con su proceso, únete a comunidades con lienzos compartidos y entra al modo fiesta:
            rondas cronometradas donde todos pintan con el mismo pincel.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/login" className="btn-primary px-6 py-3 text-base">
              Empezar a dibujar →
            </Link>
          </motion.div>

          <motion.div
            aria-hidden
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="carrusel mt-16 w-full max-w-4xl"
          >
            <div className="carrusel-pista">
              {/* Cuatro copias: la mitad de la pista debe cubrir el ancho para que el bucle no deje huecos. */}
              {Array.from({ length: 4 }, (_, copia) => (
                <div key={copia} className="flex">
                  <VistaLienzo color="#FF6B57" nombre="lienzo_azul" />
                  <VistaLienzo color="#2FD9C4" nombre="acuarela_urbana" />
                  <VistaLienzo color="#8B5CF6" nombre="pixel_studio" />
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 sm:grid-cols-3">
          {[
            {
              titulo: 'Comunidades con lienzo compartido',
              texto: 'Varios artistas pintando la misma obra en tiempo real, con pinceles con textura de verdad.',
              borde: 'borde-comunidad',
            },
            {
              titulo: 'Modo fiesta',
              texto: 'Rondas cronometradas por el servidor, sin borrar ni deshacer, y un borrador que se disputa entre todos.',
              borde: 'borde-fiesta',
            },
            {
              titulo: 'El proceso, no solo el resultado',
              texto: 'Publica tu obra final junto con cómo la fuiste armando, paso a paso.',
              borde: 'borde-proceso',
            },
          ].map((f) => (
            <div key={f.titulo} className={`card p-5 ${f.borde}`}>
              <h3 className="font-display text-lg font-semibold">{f.titulo}</h3>
              <p className="mt-2 text-sm text-paper-muted">{f.texto}</p>
            </div>
          ))}
        </section>
      </div>
  );
}

function VistaLienzo({ color, nombre }: { color: string; nombre: string }) {
  return (
    <div className="glass relative mr-2 aspect-[4/3] w-60 overflow-hidden rounded-2xl">
      <svg viewBox="0 0 200 150" className="h-full w-full">
        <path d="M10 120 Q 50 20, 100 80 T 190 40" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.9" />
        <circle cx="60" cy="60" r="22" fill={color} opacity="0.25" />
      </svg>
      <span className="absolute bottom-2 left-2 rounded-full bg-ink-800/80 px-2 py-0.5 font-mono text-[10px] text-paper-muted">
        {nombre}
      </span>
    </div>
  );
}
