import { describe, expect, it } from 'vitest';
import { SseParser } from './sseParser';

describe('SseParser', () => {
  it('parsea eventos con nombre como los manda Spring (sin espacio tras los dos puntos)', () => {
    const parser = new SseParser();
    const eventos = parser.agregar('event:init\ndata:{"estado":"CONECTADO"}\n\nevent:notificacion\ndata:{"id":"1"}\n\n');
    expect(eventos).toEqual([
      { evento: 'init', datos: '{"estado":"CONECTADO"}' },
      { evento: 'notificacion', datos: '{"id":"1"}' },
    ]);
  });

  it('junta un evento que llega cortado en varios trozos', () => {
    const parser = new SseParser();
    expect(parser.agregar('event:notifi')).toEqual([]);
    expect(parser.agregar('cacion\ndata:{"id"')).toEqual([]);
    expect(parser.agregar(':"2"}\n\n')).toEqual([{ evento: 'notificacion', datos: '{"id":"2"}' }]);
  });

  it('acepta finales de linea CRLF y quita un espacio inicial del valor', () => {
    const parser = new SseParser();
    expect(parser.agregar('event: heartbeat\r\ndata: ping\r\n\r\n')).toEqual([{ evento: 'heartbeat', datos: 'ping' }]);
  });

  it('usa "message" sin campo event, une varias lineas data e ignora comentarios', () => {
    const parser = new SseParser();
    expect(parser.agregar(': comentario\ndata:a\ndata:b\n\n')).toEqual([{ evento: 'message', datos: 'a\nb' }]);
  });

  it('descarta bloques sin data', () => {
    const parser = new SseParser();
    expect(parser.agregar('event:vacio\n\n')).toEqual([]);
  });
});
