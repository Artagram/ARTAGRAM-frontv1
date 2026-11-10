import { beforeEach, describe, expect, it } from 'vitest';
import { agruparPorDia, contadorVisible, destinoNotificacion, type Notificacion } from './notificacionesApi';
import { useNotificacionesStore } from './notificacionesStore';

function notificacion(cambios: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 'n1',
    tipo: 'NUEVO_LIKE',
    actorId: null,
    actorNombre: 'Ana',
    referenciaId: 'obra1',
    mensaje: 'hola',
    leida: false,
    creadoEn: new Date().toISOString(),
    ...cambios,
  };
}

describe('destinoNotificacion', () => {
  it('lleva a la obra, al perfil del seguidor o al perfil propio', () => {
    expect(destinoNotificacion(notificacion(), 'yo')).toBe('/obra/obra1');
    expect(destinoNotificacion(notificacion({ tipo: 'NUEVO_SEGUIDOR', actorNombre: 'Ana María' }), 'yo')).toBe('/perfil/Ana%20Mar%C3%ADa');
    expect(destinoNotificacion(notificacion({ tipo: 'SUSCRIPCION_PREMIUM' }), 'yo')).toBe('/perfil/yo');
  });

  it('no navega si falta la referencia', () => {
    expect(destinoNotificacion(notificacion({ referenciaId: null }), 'yo')).toBeNull();
  });
});

describe('agruparPorDia', () => {
  it('separa hoy de ayer conservando el orden', () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const grupos = agruparPorDia([notificacion(), notificacion({ id: 'n2' }), notificacion({ id: 'n3', creadoEn: ayer })]);

    expect(grupos.map((g) => [g.dia, g.notificaciones.length])).toEqual([['Hoy', 2], ['Ayer', 1]]);
  });
});

describe('contadorVisible', () => {
  it('limita el contador a 9+', () => {
    expect(contadorVisible(9)).toBe('9');
    expect(contadorVisible(10)).toBe('9+');
  });
});

describe('notificacionesStore', () => {
  const store = useNotificacionesStore;

  beforeEach(() => store.getState().reiniciar());

  it('suma una notificacion nueva una sola vez', () => {
    store.getState().recibir(notificacion());
    store.getState().recibir(notificacion());

    expect(store.getState().lista).toHaveLength(1);
    expect(store.getState().noLeidas).toBe(1);
  });

  it('cuenta los mensajes aparte y fuera de la lista', () => {
    store.getState().recibir(notificacion({ tipo: 'MENSAJE_DIRECTO' }));

    expect(store.getState().mensajes).toBe(1);
    expect(store.getState().noLeidas).toBe(0);
    expect(store.getState().lista).toHaveLength(0);
  });

  it('marcar dos veces la misma no descuenta de mas', () => {
    store.getState().fijarContadores({ notificaciones: 2, mensajes: 0 });
    store.getState().fijarLista([notificacion()]);

    store.getState().marcarLeida('n1');
    store.getState().marcarLeida('n1');

    expect(store.getState().noLeidas).toBe(1);
  });
});
