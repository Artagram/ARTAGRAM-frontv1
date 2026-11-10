import type { PublicacionDto } from '../types';

export interface ArtistaRecomendado {
  autorId: string;
  autorNombre: string;
  puntaje: number;
  /** Por qué se recomienda, para mostrarlo al usuario. */
  motivo: string;
}

/** Peso de cada señal: lo que ya te gustó pesa más que la popularidad general. */
export const PESOS = {
  likePropio: 30,
  etiquetaEnComun: 8,
  likeRecibido: 1,
} as const;

/**
 * Recomienda artistas a partir de las publicaciones de "explorar" (no hay un
 * endpoint de recomendaciones en el backend). Puntúa a cada autor por:
 *  - obras suyas que ya te gustaron,
 *  - etiquetas que comparte con las obras que te gustaron,
 *  - likes que reciben sus obras (popularidad).
 * Excluye al propio usuario y a quienes ya sigue.
 */
export function recomendarArtistas(
  publicaciones: PublicacionDto[],
  miId: string,
  seguidos: ReadonlySet<string>,
  limite = 5,
): ArtistaRecomendado[] {
  const etiquetasQueMeGustan = new Set(
    publicaciones.filter((p) => p.meGusta).flatMap((p) => p.etiquetas.map((e) => e.toLowerCase())),
  );

  const porAutor = new Map<string, { nombre: string; likesPropios: number; etiquetas: Set<string>; likesRecibidos: number }>();
  for (const p of publicaciones) {
    if (!p.autorId || p.autorId === miId || seguidos.has(p.autorId)) continue;
    const datos = porAutor.get(p.autorId) ?? { nombre: p.autorNombre, likesPropios: 0, etiquetas: new Set<string>(), likesRecibidos: 0 };
    if (p.meGusta) datos.likesPropios += 1;
    datos.likesRecibidos += p.contadorLikes;
    for (const e of p.etiquetas) {
      if (etiquetasQueMeGustan.has(e.toLowerCase())) datos.etiquetas.add(e.toLowerCase());
    }
    porAutor.set(p.autorId, datos);
  }

  return [...porAutor.entries()]
    .map(([autorId, d]) => {
      const puntaje =
        d.likesPropios * PESOS.likePropio + d.etiquetas.size * PESOS.etiquetaEnComun + d.likesRecibidos * PESOS.likeRecibido;
      const motivo =
        d.likesPropios > 0
          ? 'Te gustaron sus obras'
          : d.etiquetas.size > 0
            ? `También pinta ${[...d.etiquetas].slice(0, 2).map((e) => `#${e}`).join(' y ')}`
            : 'Popular en Artagram';
      return { autorId, autorNombre: d.nombre, puntaje, motivo };
    })
    .sort((a, b) => b.puntaje - a.puntaje || a.autorNombre.localeCompare(b.autorNombre))
    .slice(0, limite);
}
