import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { WS_URL } from './api';
import { obtenerTokenActual } from './authStore';

export type EstadoConexion = 'desconectado' | 'conectando' | 'conectado' | 'reconectando';

/** Tope de mensajes guardados mientras no hay conexion (escenario 4). */
export const MAX_PENDIENTES = 500;

interface MensajePendiente {
  destino: string;
  cuerpo: string;
}

function nuevoTraceId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function urlConToken(token: string): string {
  return `${WS_URL}${WS_URL.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

/**
 * Una sola conexion STOMP compartida por toda la sesion (lienzo, banner,
 * fiesta y chat se suscriben sobre ella). El token va como query param en la
 * URL del WebSocket porque el navegador no puede mandar headers propios en el
 * handshake nativo (ver JwtHandshakeInterceptor en el backend).
 *
 * Reconexion (escenario 4): stompjs reintenta solo cada segundo; en cada
 * reconexion se vuelven a aplicar las suscripciones, se envian los mensajes
 * confiables que quedaron en cola sin conexion y se avisa a quien lo pidio
 * para que vuelva a pedir el estado al servidor, que es la autoridad.
 */
class StompService {
  private client: Client | null = null;
  private tokenActual: string | null = null;
  private yaConecto = false;
  private estado: EstadoConexion = 'desconectado';
  // Suscripciones activas: se (re)aplican en cada conexion, incluidas las
  // reconexiones automaticas, y salen del conjunto al desuscribirse.
  private suscripcionesActivas = new Set<() => void>();
  private callbacksAlConectar = new Set<() => void>();
  private callbacksAlReconectar = new Set<() => void>();
  private oyentesEstado = new Set<(estado: EstadoConexion) => void>();
  private pendientes: MensajePendiente[] = [];

  /**
   * Cuando el navegador avisa que volvio la red no se espera a que venza un
   * intento de conexion que quedo colgado durante el corte: se corta y la
   * reconexion arranca de inmediato (escenario 4, reconexion en < 5 s).
   */
  private readonly alVolverLaRed = () => {
    if (this.client?.active && this.estado === 'reconectando') {
      this.client.forceDisconnect();
    }
  };

  conectar(token: string): void {
    if (this.client?.active && this.tokenActual === token) {
      return;
    }
    this.desconectar();
    this.tokenActual = token;
    this.yaConecto = false;
    this.cambiarEstado('conectando');

    const client = new Client({
      brokerURL: urlConToken(token),
      reconnectDelay: 1000,
      // Un intento que se queda colgado (p. ej. justo cuando vuelve la red) se
      // corta a los 3 s y se reintenta; sin esto se esperaba el timeout del
      // navegador (~20 s) y la reconexion pasaba de los 5 s del escenario 4.
      connectionTimeout: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // En cada intento se usa el token vigente: tras una hora el del primer
      // intento ya vencio y la reconexion fallaria para siempre.
      beforeConnect: () => {
        const vigente = obtenerTokenActual() ?? this.tokenActual;
        if (vigente) {
          this.tokenActual = vigente;
          client.brokerURL = urlConToken(vigente);
        }
      },
      onConnect: () => this.alAbrirConexion(),
      onWebSocketClose: () => {
        if (this.client === client && client.active) {
          this.cambiarEstado('reconectando');
        }
      },
    });
    this.client = client;
    client.activate();
    globalThis.addEventListener?.('online', this.alVolverLaRed);
  }

  private alAbrirConexion(): void {
    const esReconexion = this.yaConecto;
    this.yaConecto = true;
    this.cambiarEstado('conectado');
    this.suscripcionesActivas.forEach((fn) => fn());
    this.callbacksAlConectar.forEach((fn) => fn());
    this.vaciarPendientes();
    if (esReconexion) {
      this.callbacksAlReconectar.forEach((fn) => fn());
    }
  }

  desconectar(): void {
    const anterior = this.client;
    this.client = null;
    globalThis.removeEventListener?.('online', this.alVolverLaRed);
    void anterior?.deactivate();
    this.pendientes = [];
    this.cambiarEstado('desconectado');
  }

  estaConectado(): boolean {
    return !!this.client?.connected;
  }

  obtenerEstado(): EstadoConexion {
    return this.estado;
  }

  /** Avisa cada cambio de estado de la conexion; devuelve la funcion para dejar de escuchar. */
  alCambiarEstado(callback: (estado: EstadoConexion) => void): () => void {
    this.oyentesEstado.add(callback);
    return () => {
      this.oyentesEstado.delete(callback);
    };
  }

  /**
   * Se llama tras cada reconexion (no en la primera conexion): es el momento
   * de pedir al servidor el estado actual de lo que se estaba mostrando.
   */
  alReconectar(callback: () => void): () => void {
    this.callbacksAlReconectar.add(callback);
    return () => {
      this.callbacksAlReconectar.delete(callback);
    };
  }

  /**
   * Se suscribe ahora si hay conexion y se re-suscribe sola tras cada
   * reconexion (util cuando se cae la red), hasta llamar a la funcion devuelta.
   */
  suscribir<T>(destino: string, callback: (payload: T) => void): () => void {
    let subscripcion: StompSubscription | null = null;
    const suscribirAhora = () => {
      subscripcion = this.client!.subscribe(destino, (mensaje: IMessage) => {
        try {
          callback(JSON.parse(mensaje.body) as T);
        } catch {
          // payload no era JSON: se ignora
        }
      });
    };

    this.suscripcionesActivas.add(suscribirAhora);
    if (this.client?.connected) {
      suscribirAhora();
    }

    return () => {
      this.suscripcionesActivas.delete(suscribirAhora);
      try {
        if (this.client?.connected) subscripcion?.unsubscribe();
      } catch {
        // la conexion se cerro en el medio: no queda nada que desuscribir
      }
      subscripcion = null;
    };
  }

  /** Envio de mejor esfuerzo: sin conexion se descarta (puntos parciales, cursores). */
  publicar(destino: string, body: unknown): void {
    if (!this.client?.connected) {
      return;
    }
    this.enviar(destino, JSON.stringify(body));
  }

  /**
   * Envio que no se pierde por un corte de red: sin conexion queda en cola y
   * sale al reconectar (trazos terminados). Devuelve false si se encolo.
   */
  publicarConfiable(destino: string, body: unknown): boolean {
    const cuerpo = JSON.stringify(body);
    if (this.client?.connected) {
      this.enviar(destino, cuerpo);
      return true;
    }
    if (this.client) {
      this.pendientes.push({ destino, cuerpo });
      if (this.pendientes.length > MAX_PENDIENTES) {
        this.pendientes.shift();
      }
    }
    return false;
  }

  cantidadPendientes(): number {
    return this.pendientes.length;
  }

  alConectar(callback: () => void): () => void {
    if (this.client?.connected) {
      callback();
      return () => {};
    }
    this.callbacksAlConectar.add(callback);
    return () => {
      this.callbacksAlConectar.delete(callback);
    };
  }

  private enviar(destino: string, cuerpo: string): void {
    // traceId por mensaje: el servidor lo usa en sus logs y lo propaga (escenario 10).
    this.client!.publish({ destination: destino, body: cuerpo, headers: { traceId: nuevoTraceId() } });
  }

  private vaciarPendientes(): void {
    const enCola = this.pendientes;
    this.pendientes = [];
    for (const mensaje of enCola) {
      this.enviar(mensaje.destino, mensaje.cuerpo);
    }
  }

  private cambiarEstado(estado: EstadoConexion): void {
    if (this.estado === estado) return;
    this.estado = estado;
    this.oyentesEstado.forEach((fn) => fn(estado));
  }
}

export const stompService = new StompService();
