export interface EventoSse {
  evento: string;
  datos: string;
}

/**
 * Parser incremental de text/event-stream. Se usa en vez de EventSource porque
 * artagram-notifications solo acepta el token en el header Authorization, y
 * EventSource no deja mandar headers: el stream se lee con fetch y los trozos
 * que llegan (que pueden cortar un evento por la mitad) pasan por aqui.
 */
export class SseParser {
  private pendiente = '';

  /** Agrega un trozo recibido y devuelve los eventos que quedaron completos. */
  agregar(trozo: string): EventoSse[] {
    this.pendiente += trozo.replace(/\r\n?/g, '\n');
    const eventos: EventoSse[] = [];
    let fin = this.pendiente.indexOf('\n\n');
    while (fin !== -1) {
      const bloque = this.pendiente.slice(0, fin);
      this.pendiente = this.pendiente.slice(fin + 2);
      const evento = parsearBloque(bloque);
      if (evento) eventos.push(evento);
      fin = this.pendiente.indexOf('\n\n');
    }
    return eventos;
  }
}

function parsearBloque(bloque: string): EventoSse | null {
  let evento = 'message';
  const datos: string[] = [];
  for (const linea of bloque.split('\n')) {
    if (!linea || linea.startsWith(':')) continue;
    const separador = linea.indexOf(':');
    const campo = separador === -1 ? linea : linea.slice(0, separador);
    let valor = separador === -1 ? '' : linea.slice(separador + 1);
    if (valor.startsWith(' ')) valor = valor.slice(1);
    if (campo === 'event') evento = valor;
    else if (campo === 'data') datos.push(valor);
  }
  return datos.length ? { evento, datos: datos.join('\n') } : null;
}
