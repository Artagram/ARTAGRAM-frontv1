import type { ArtistaDibujandoDto, PresenciaEvento } from '../types';

/** Aplica un evento en vivo de presencia a la lista: entra (o se actualiza) o sale. */
export function aplicarEventoPresencia(lista: ArtistaDibujandoDto[], evento: PresenciaEvento): ArtistaDibujandoDto[] {
  const sinEl = lista.filter((a) => a.usuarioId !== evento.artista.usuarioId);
  return evento.tipo === 'EMPEZO_A_DIBUJAR' ? [evento.artista, ...sinEl] : sinEl;
}
