export interface DisenoMarca {
  /** Tamaño de letra del sello de la esquina. */
  fuenteSello: number;
  /** Tamaño de letra del texto repetido en diagonal. */
  fuenteTrama: number;
  /** Margen del sello respecto al borde. */
  margen: number;
  /** Espacio libre entre una repetición de la trama y la siguiente (se suma al ancho del texto). */
  separacion: number;
}

/**
 * Tamaños proporcionales a la imagen, para que la marca se lea igual en una
 * miniatura que en una obra de 4000 px (con mínimos para las muy chicas).
 */
export function calcularDisenoMarca(ancho: number, alto: number): DisenoMarca {
  const lado = Math.min(ancho, alto);
  const fuenteSello = Math.max(12, Math.round(lado * 0.035));
  const fuenteTrama = Math.max(14, Math.round(lado * 0.05));
  return {
    fuenteSello,
    fuenteTrama,
    margen: Math.max(8, Math.round(lado * 0.02)),
    separacion: Math.round(fuenteTrama * 3),
  };
}

/** Nombre de archivo seguro a partir del título de la obra. */
export function nombreArchivoObra(titulo: string, autor: string): string {
  const limpio = (texto: string) =>
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  const base = [limpio(titulo), limpio(autor)].filter(Boolean).join('_') || 'obra';
  return `${base.slice(0, 80)}_artagram.jpg`;
}

function cargarImagen(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('El archivo descargado no es una imagen válida'));
    };
    imagen.src = url;
  });
}

function dibujarMarca(ctx: CanvasRenderingContext2D, ancho: number, alto: number, texto: string) {
  const diseno = calcularDisenoMarca(ancho, alto);

  // Trama diagonal tenue sobre toda la obra: no se puede recortar como un sello en la esquina
  ctx.save();
  ctx.translate(ancho / 2, alto / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.font = `600 ${diseno.fuenteTrama}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Relleno claro con borde oscuro: se distingue tanto en obras claras como oscuras
  ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = Math.max(1, diseno.fuenteTrama / 14);
  const diagonal = Math.hypot(ancho, alto);
  const filas = diseno.fuenteTrama * 4;
  // El paso depende del texto medido: un nombre largo no se monta sobre la siguiente repetición
  const paso = ctx.measureText(texto).width + diseno.separacion;
  for (let y = -diagonal / 2; y <= diagonal / 2; y += filas) {
    // Filas alternas desplazadas medio paso para que no queden columnas alineadas
    const desfase = (Math.round(y / filas) % 2) * (paso / 2);
    for (let x = -diagonal / 2 - desfase; x <= diagonal / 2 + paso; x += paso) {
      ctx.strokeText(texto, x, y);
      ctx.fillText(texto, x, y);
    }
  }
  ctx.restore();

  // Sello legible en la esquina inferior derecha
  ctx.save();
  ctx.font = `700 ${diseno.fuenteSello}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const relleno = diseno.fuenteSello * 0.5;
  const anchoTexto = ctx.measureText(texto).width;
  const x = ancho - diseno.margen;
  const y = alto - diseno.margen;
  ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
  ctx.fillRect(x - anchoTexto - relleno * 2, y - diseno.fuenteSello - relleno * 1.5, anchoTexto + relleno * 2, diseno.fuenteSello + relleno * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(texto, x - relleno, y - relleno / 2);
  ctx.restore();
}

/**
 * Descarga la obra con la marca de agua "© autor · Artagram" dibujada encima.
 * La imagen se baja con fetch y se pinta desde un blob local: si se usara la
 * URL remota directo, el canvas quedaría "contaminado" por CORS y no dejaría
 * exportar. Si algo falla se lanza error y no se entrega la imagen sin marca.
 */
export async function descargarConMarcaDeAgua({ url, autor, titulo }: { url: string; autor: string; titulo: string }) {
  let respuesta: Response;
  try {
    respuesta = await fetch(url);
  } catch {
    throw new Error('No se pudo acceder a la imagen de la obra');
  }
  if (!respuesta.ok) throw new Error('No se pudo acceder a la imagen de la obra');

  const imagen = await cargarImagen(await respuesta.blob());
  const canvas = document.createElement('canvas');
  canvas.width = imagen.naturalWidth;
  canvas.height = imagen.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite preparar la descarga');

  // Fondo blanco: el JPG no tiene transparencia y un PNG con alfa quedaría negro
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imagen, 0, 0);
  dibujarMarca(ctx, canvas.width, canvas.height, `© ${autor} · Artagram`);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('No se pudo generar el archivo');

  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombreArchivoObra(titulo, autor);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}
