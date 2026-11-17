import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cliente STOMP falso: permite simular conexion, corte y reconexion.
const instancias: ClienteFalso[] = [];
class ClienteFalso {
  connected = false;
  active = false;
  brokerURL: string;
  publicados: { destination: string; body: string; headers?: Record<string, string> }[] = [];
  suscritos: string[] = [];
  config: Record<string, unknown> & { brokerURL: string };
  constructor(config: Record<string, unknown> & { brokerURL: string }) {
    this.config = config;
    this.brokerURL = config.brokerURL;
    instancias.push(this);
  }
  activate() {
    this.active = true;
  }
  deactivate() {
    this.active = false;
    this.connected = false;
    return Promise.resolve();
  }
  publish(m: { destination: string; body: string; headers?: Record<string, string> }) {
    this.publicados.push(m);
  }
  subscribe(destino: string) {
    this.suscritos.push(destino);
    return { unsubscribe: vi.fn() };
  }
  abrir() {
    (this.config.beforeConnect as () => void)?.();
    this.connected = true;
    (this.config.onConnect as () => void)();
  }
  cortar() {
    this.connected = false;
    (this.config.onWebSocketClose as () => void)();
  }
}

vi.mock('@stomp/stompjs', () => ({ Client: ClienteFalso }));
vi.mock('./authStore', () => ({ obtenerTokenActual: () => 'token-nuevo' }));
vi.mock('./api', () => ({ WS_URL: 'ws://localhost/ws' }));

const { stompService, MAX_PENDIENTES } = await import('./stompClient');

describe('stompService (escenario 4: reconexion)', () => {
  beforeEach(() => {
    stompService.desconectar();
    instancias.length = 0;
  });

  it('al reconectar re-suscribe, envia lo encolado y avisa para pedir el estado', () => {
    const estados: string[] = [];
    const quitarEstado = stompService.alCambiarEstado((e) => estados.push(e));
    const resincronizar = vi.fn();
    const quitarReconexion = stompService.alReconectar(resincronizar);

    stompService.conectar('token-viejo');
    const cliente = instancias[0];
    stompService.suscribir('/topic/lienzo/1', () => {});
    cliente.abrir();
    expect(resincronizar).not.toHaveBeenCalled();
    expect(cliente.suscritos).toEqual(['/topic/lienzo/1']);
    // El token se toma del store en cada intento, no el del primer conectar.
    expect(cliente.brokerURL).toContain('token=token-nuevo');

    cliente.cortar();
    expect(stompService.obtenerEstado()).toBe('reconectando');
    stompService.publicar('/app/lienzo/1/parcial', { p: 1 });
    expect(stompService.publicarConfiable('/app/lienzo/1/final', { t: 1 })).toBe(false);
    expect(stompService.cantidadPendientes()).toBe(1);

    cliente.abrir();
    expect(cliente.suscritos).toEqual(['/topic/lienzo/1', '/topic/lienzo/1']);
    expect(cliente.publicados.map((m) => m.destination)).toEqual(['/app/lienzo/1/final']);
    expect(cliente.publicados[0].headers?.traceId).toMatch(/^[0-9a-f]{16}$/);
    expect(stompService.cantidadPendientes()).toBe(0);
    expect(resincronizar).toHaveBeenCalledTimes(1);
    expect(estados).toEqual(['conectando', 'conectado', 'reconectando', 'conectado']);

    expect(stompService.publicarConfiable('/app/lienzo/1/final', { t: 2 })).toBe(true);
    quitarEstado();
    quitarReconexion();
  });

  it('la cola tiene tope y se descarta al desconectar a proposito', () => {
    stompService.conectar('t');
    for (let i = 0; i < MAX_PENDIENTES + 5; i++) {
      stompService.publicarConfiable('/app/x', { i });
    }
    expect(stompService.cantidadPendientes()).toBe(MAX_PENDIENTES);
    stompService.desconectar();
    expect(stompService.cantidadPendientes()).toBe(0);
    expect(stompService.publicarConfiable('/app/x', {})).toBe(false);
    expect(stompService.cantidadPendientes()).toBe(0);
  });

  it('alConectar corre de inmediato si ya hay conexion', () => {
    const alConectar = vi.fn();
    stompService.conectar('t');
    const quitar = stompService.alConectar(alConectar);
    instancias[0].abrir();
    expect(alConectar).toHaveBeenCalledTimes(1);
    quitar();
    const inmediato = vi.fn();
    stompService.alConectar(inmediato)();
    expect(inmediato).toHaveBeenCalledTimes(1);
    expect(stompService.estaConectado()).toBe(true);
  });
});
