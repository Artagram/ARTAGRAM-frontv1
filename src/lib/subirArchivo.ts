import axios from 'axios';
import { api, extraerMensajeError } from './api';

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Los microservicios no reciben archivos: se pide una URL prefirmada, el
 * navegador sube el archivo directo a S3 y al backend solo viaja la clave.
 * El PUT va con fetch (no con api) para no mandar el Authorization del
 * usuario a S3, que invalidaria la firma.
 */
export async function subirArchivo(archivo: File): Promise<string> {
  const contentType = archivo.type || 'application/octet-stream';
  const { data } = await api.post<PresignResponse>('/api/media/presign', {
    filename: archivo.name,
    contentType,
  });
  // Sin S3 configurado el backend devuelve la misma URL publica como "uploadUrl": no hay donde subir
  if (data.uploadUrl === data.publicUrl) {
    throw new Error('El almacenamiento de imágenes no está configurado en el servidor');
  }
  let respuesta: Response;
  try {
    respuesta = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: archivo,
    });
  } catch {
    // fetch solo lanza por red/CORS: el almacenamiento no es alcanzable desde el navegador
    throw new Error('No se pudo conectar con el almacenamiento de imágenes');
  }
  if (!respuesta.ok) {
    throw new Error('No se pudo subir la imagen, intenta de nuevo');
  }
  return data.key;
}

/** Igual que extraerMensajeError, pero también muestra los errores propios de subirArchivo. */
export function mensajeErrorSubida(error: unknown, porDefecto?: string): string {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error.message;
  }
  return extraerMensajeError(error, porDefecto);
}
