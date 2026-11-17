import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { stompService } from '../lib/stompClient';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export const YO = 'u-yo';
export const OTRO = 'u-otro';
const AHORA = '2026-11-16T10:00:00Z';

export const publicacion = {
  id: 'p1', autorId: OTRO, autorNombre: 'sam', titulo: 'Obra', descripcion: 'desc', obraFinalUrl: '/media/a.png',
  imagenesProcesoUrls: ['/media/b.png'], etiquetas: ['oleo'], contadorLikes: 2, meGusta: false, creadoEn: AHORA,
  contadorComentarios: 1, version: 2, editadoEn: AHORA, destacada: false, oculta: false,
};
export const propia = { ...publicacion, id: 'p2', autorId: YO, autorNombre: 'ana', destacada: true };
export const comunidad = { id: 'c1', nombre: 'Acuarela', descripcion: 'd', publica: true, creador: 'ana', totalMiembros: 2, miRol: 'ADMIN' };
export const sala = { id: 's1', codigo: 'ABC123', anfitrionNombre: 'ana', duracionRondaSegundos: 30, cupoMaximo: 4,
  estado: 'EN_RONDA', totalParticipantes: 2, numeroRonda: 1, totalRondas: 3 };
const punto = [{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.4 }, { x: 0.5, y: 0.5 }];
export const trazoParty = { secuencia: 1, autorId: OTRO, autorNombre: 'sam', borrador: false, tipoPincel: 'LAPIZ',
  colorHex: '#000000', grosor: 4, opacidad: 1, puntos: punto };
export const trazoLienzo = { id: 't1', secuencia: 1, autorId: YO, autorNombre: 'ana', tipoPincel: 'MARCADOR', colorHex: '#ff0000',
  grosor: 6, opacidad: 1, capa: 0, puntos: punto, creadoEn: AHORA };
const comentario = { id: 'k1', publicacionId: 'p1', autorId: YO, autorNombre: 'ana', contenido: 'bonito', creadoEn: AHORA };
const mensaje = { id: 'm1', remitenteId: OTRO, remitenteNombre: 'sam', destinatarioId: YO, contenido: 'hola', entregado: true, creadoEn: AHORA };

function respuestaGet(url: string): unknown {
  const reglas: [RegExp, unknown][] = [
    [/^\/api\/feed\//, { publicaciones: [publicacion, propia], cursorFechaSiguiente: null, cursorIdSiguiente: null, hayMas: true, artistasSugeridos: ['sam'] }],
    [/\/comentarios$/, [comentario]],
    [/\/chat$/, [{ id: 'mc1', remitenteId: OTRO, remitenteNombre: 'sam', contenido: 'hola', creadoEn: AHORA }]],
    [/\/analisis$/, { id: 'a1', publicacionId: 'p1', estado: 'LISTO', creadoEn: AHORA, puntosFuertes: ['luz'], areasMejora: ['forma'], consejos: ['practica'], scoreEstimado: 7 }],
    [/\/descargar$/, { url: 'https://x/y.png' }],
    [/\/banner$/, [{ regionIndex: 0, snapshotPngBase64: null, trazosDesdeSnapshot: [{ ...trazoParty, regionIndex: 0, autorId: OTRO }] }]],
    [/\/lienzo\/trazos/, [trazoLienzo, { ...trazoLienzo, id: 't2', secuencia: 2, autorId: OTRO, autorNombre: 'sam', tipoPincel: 'ACUARELA' }]],
    [/\/api\/comunidades\/[^/]+\/miembros$/, [{ usuarioId: YO, nombreArtista: 'ana', rol: 'ADMIN', unidoEn: AHORA },
      { usuarioId: OTRO, nombreArtista: 'sam', rol: 'MIEMBRO', unidoEn: AHORA }]],
    [/\/api\/comunidades\/(mias|recomendadas)/, [comunidad, { ...comunidad, id: 'c2', nombre: 'Tinta', miRol: null }]],
    [/\/api\/comunidades\/[^/]+$/, comunidad],
    [/\/api\/fiestas\/[^/]+\/estado$/, { estadoSala: 'EN_RONDA', numeroRonda: 1, totalRondas: 3, msRestantes: 20000, pincel: 'LAPIZ',
      colorHex: '#123456', grosor: 8, opacidad: 1, borradorPropietario: null, trazos: [trazoParty, { ...trazoParty, secuencia: 2, borrador: true }] }],
    [/\/api\/fiestas\/[^/]+\/herramientas$/, { MARCADOR: 'sam' }],
    [/\/api\/fiestas\/activas$/, [sala, { ...sala, id: 's2', estado: 'ESPERANDO', anfitrionNombre: 'sam' }]],
    [/\/api\/fiestas\/[^/]+$/, sala],
    [/\/api\/mensajes\/conversaciones$/, [{ contactoId: OTRO, contactoNombre: 'sam', ultimoMensaje: 'hola', ultimoMensajeEn: AHORA, entregado: true }]],
    [/\/api\/mensajes\/con\//, [mensaje, { ...mensaje, id: 'm2', remitenteId: YO, remitenteNombre: 'ana', destinatarioId: OTRO }]],
    [/\/api\/perfiles\//, { usuarioId: YO, nombreArtista: 'ana', biografia: 'bio', fotoUrl: null, enlaces: [{ etiqueta: 'web', url: 'https://a.b' }],
      obrasDestacadas: [], esPropio: true, premium: false }],
    [/\/destacadas$/, [propia]],
    [/\/api\/publicaciones\/artista\//, { content: [propia, { ...propia, id: 'p3', destacada: false }], last: false }],
    [/\/api\/publicaciones\/[^/]+$/, publicacion],
    [/\/no-leidas\/cantidad$/, { notificaciones: 2, mensajes: 1 }],
    [/^\/api\/notificaciones$/, [
      { id: 'n1', tipo: 'NUEVO_LIKE', actorId: OTRO, actorNombre: 'sam', referenciaId: 'p1', mensaje: 'le gusto', leida: false, creadoEn: AHORA },
      { id: 'n2', tipo: 'MENSAJE_DIRECTO', actorId: OTRO, actorNombre: 'sam', referenciaId: null, mensaje: 'msg', leida: true, creadoEn: '2026-11-10T10:00:00Z' }]],
    [/\/api\/suscripcion\/actual$/, { plan: 'GRATIS', estado: 'ACTIVA', fechaFin: null, premium: false, megabytesUsados: 10, maxMegabytes: 100, obrasSubidas: 2, maxObras: 10 }],
    [/\/api\/admin\/kpis$/, [{ id: 'k', nombre: 'Retencion', valorActual: 40, meta: 50, tendencia: 'SUBE', formula: 'f', periodoDesde: AHORA, periodoHasta: AHORA, cantidadEventosContados: 3 }]],
    [/\/api\/admin\/dashboard$/, { panelTecnicoUrl: 'https://g/t', panelNegocioUrl: 'https://g/n', prometheusUrl: 'https://p' }],
    [/\/api\/moderacion\/reportes$/, [{ publicacionId: 'p1', titulo: 'Obra', imagenUrl: '/a.png', autorNombre: 'sam', oculta: false, total: 2,
      motivos: { SPAM: 2 }, detalles: ['feo'], ultimoEn: AHORA }]],
    [/\/api\/artistas\/siguiendo\/en-vivo$/, [{ usuarioId: OTRO, nombreArtista: 'sam', comunidadId: 'c1', comunidadNombre: 'Acuarela', tipo: 'LIENZO', recursoId: 'c1' }]],
    [/\/api\/artistas/, [{ usuarioId: OTRO, nombreArtista: 'sam', fotoUrl: null, seguidores: 3, enComun: 1, loSigo: false }]],
  ];
  const regla = reglas.find(([re]) => re.test(url));
  return regla ? regla[1] : {};
}

function respuestaPost(url: string): unknown {
  if (/\/api\/fiestas(\/unirse)?$/.test(url)) return sala;
  if (/\/bloqueo$/.test(url)) return { tomado: true, propietarioNombre: 'ana' };
  if (/\/herramientas\//.test(url)) return { tomado: true, herramienta: 'LAPIZ', propietarioNombre: 'ana' };
  if (/\/borrador$/.test(url)) return { tomado: true, propietarioNombre: 'ana' };
  if (/\/like$/.test(url)) return { meGusta: true, contadorLikes: 3 };
  if (/\/comentarios$/.test(url)) return comentario;
  if (/\/api\/mensajes$/.test(url)) return mensaje;
  if (/\/seguir$/.test(url)) return { loSigo: true, seguidores: 4 };
  if (/\/api\/ia\/sugerencias$/.test(url)) return { tituloSugerido: 'T', descripcionSugerida: 'D', etiquetas: ['a'] };
  if (/\/invitar$/.test(url)) return { usuarioId: 'u3', nombreArtista: 'leo', rol: 'MIEMBRO', unidoEn: AHORA };
  if (/\/api\/publicaciones$/.test(url)) return propia;
  if (/\/foto$/.test(url)) return { fotoUrl: '/f.png' };
  return {};
}

export type Callback = (payload: unknown) => void;
export const suscripciones = new Map<string, Callback[]>();

export function prepararEntorno(rol = 'USUARIO') {
  useAuthStore.setState({ sesion: { accessToken: 't', usuarioId: YO, nombreArtista: 'ana', rolGlobal: rol, premium: false }, sesionExpirada: false });
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => ({ data: respuestaGet(url) }) as never);
  vi.spyOn(api, 'post').mockImplementation(async (url: string) => ({ data: respuestaPost(url) }) as never);
  vi.spyOn(api, 'put').mockImplementation(async () => ({ data: propia }) as never);
  vi.spyOn(api, 'patch').mockImplementation(async () => ({ data: {} }) as never);
  vi.spyOn(api, 'delete').mockImplementation(async () => ({ data: publicacion }) as never);
  suscripciones.clear();
  vi.spyOn(stompService, 'conectar').mockImplementation(() => {});
  vi.spyOn(stompService, 'estaConectado').mockReturnValue(true);
  vi.spyOn(stompService, 'publicar').mockImplementation(() => {});
  vi.spyOn(stompService, 'alConectar').mockImplementation((cb: () => void) => { cb(); return () => {}; });
  vi.spyOn(stompService, 'suscribir').mockImplementation(((destino: string, cb: Callback) => {
    suscripciones.set(destino, [...(suscripciones.get(destino) ?? []), cb]);
    return () => {};
  }) as never);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'open').mockImplementation(() => null);
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get: (obj, prop) => {
      if (prop in obj) return obj[prop];
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop: () => {} });
      if (prop === 'canvas') return document.createElement('canvas');
      return () => {};
    },
    set: (obj, prop, valor) => { obj[prop] = valor; return true; },
  });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AA==';
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) { cb(new Blob(['x'], { type: 'image/png' })); };
  HTMLCanvasElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 500, bottom: 500, width: 500, height: 500, toJSON: () => ({}) });
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never;
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as never;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
  window.scrollTo = (() => {}) as never;
  URL.createObjectURL = () => 'blob:x';
  URL.revokeObjectURL = () => {};
}

/** Deja correr las promesas y macrotareas pendientes (sin esperar un tiempo fijo). */
export async function esperar() {
  for (let i = 0; i < 3; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
}

/** Espera hasta que se cumpla la condicion (o falla tras el limite). */
export async function esperarQue(condicion: () => boolean, limiteMs = 3000) {
  const fin = Date.now() + limiteMs;
  while (!condicion()) {
    if (Date.now() > fin) throw new Error('La condicion no se cumplio a tiempo');
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  }
}

export interface Montaje { contenedor: HTMLElement; raiz: Root; desmontar: () => Promise<void> }

export async function montar(elemento: ReactNode, ruta = '/', patron = '*'): Promise<Montaje> {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const raiz = createRoot(contenedor);
  await act(async () => raiz.render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes><Route path={patron} element={elemento} /><Route path="*" element={<div>otra</div>} /></Routes>
    </MemoryRouter>,
  ));
  await esperar();
  return { contenedor, raiz, desmontar: async () => { await act(async () => raiz.unmount()); contenedor.remove(); } };
}

export async function emitir(prefijo: string, payload: unknown) {
  for (const [destino, cbs] of suscripciones) {
    if (destino.includes(prefijo)) {
      await act(async () => cbs.forEach((cb) => { try { cb(payload); } catch { /* el componente puede rechazarlo */ } }));
    }
  }
}

function puntero(el: Element, tipo: string, x: number, y: number) {
  const ev = new MouseEvent(tipo, { bubbles: true, clientX: x, clientY: y, buttons: 1 });
  Object.assign(ev, { pointerId: 1, pointerType: 'mouse', isPrimary: true, pressure: 0.5 });
  el.dispatchEvent(ev);
}

export async function dibujar(raiz: HTMLElement) {
  for (const lienzo of Array.from(raiz.querySelectorAll('canvas'))) {
    await act(async () => {
      puntero(lienzo, 'pointerdown', 50, 50);
      puntero(lienzo, 'pointermove', 80, 90);
      puntero(lienzo, 'pointermove', 120, 140);
      puntero(lienzo, 'pointerup', 120, 140);
      puntero(lienzo, 'mousedown', 10, 10);
      puntero(lienzo, 'mousemove', 30, 30);
      puntero(lienzo, 'mouseup', 30, 30);
      puntero(lienzo, 'pointerleave', 30, 30);
    });
  }
  await esperar();
}

const setterValor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
const setterArea = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;

export async function escribir(raiz: HTMLElement, texto = 'hola mundo') {
  for (const campo of Array.from(raiz.querySelectorAll('input, textarea, select'))) {
    await act(async () => {
      if (campo instanceof HTMLInputElement) {
        if (campo.type === 'file') {
          Object.defineProperty(campo, 'files', { configurable: true, value: [new File(['x'], 'a.png', { type: 'image/png' })] });
        } else if (campo.type === 'checkbox' || campo.type === 'radio') {
          campo.click();
          return;
        } else {
          setterValor.call(campo, campo.type === 'number' || campo.type === 'range' ? '5' : campo.type === 'color' ? '#00ff00' : texto);
        }
      } else if (campo instanceof HTMLTextAreaElement) {
        setterArea.call(campo, texto);
      } else if (campo instanceof HTMLSelectElement && campo.options.length > 1) {
        campo.selectedIndex = 1;
      }
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  for (const form of Array.from(raiz.querySelectorAll('form'))) {
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  }
  await esperar();
}

/** Pulsa cada boton visible (varias pasadas, porque la UI cambia al pulsar). */
export async function pulsarTodo(raiz: HTMLElement, pasadas = 2, evitar: RegExp = /cerrar sesi|salir de la sala|^salir$/i) {
  const pulsados = new Set<string>();
  for (let i = 0; i < pasadas; i++) {
    const botones = Array.from(document.body.querySelectorAll('button, [role="button"], a[href="#"]')) as HTMLElement[];
    for (const b of botones) {
      const clave = `${i}:${b.textContent}:${b.getAttribute('aria-label')}:${b.title}`;
      if (pulsados.has(clave) || !raiz.isConnected) continue;
      if (evitar.test(b.textContent ?? '') || evitar.test(b.getAttribute('aria-label') ?? '')) continue;
      pulsados.add(clave);
      await act(async () => {
        try { b.click(); } catch { /* algun handler puede lanzar */ }
      });
      await esperar();
    }
  }
}

export async function teclas(destino: EventTarget, claves: string[]) {
  for (const key of claves) {
    await act(async () => {
      destino.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ctrlKey: key === 'z' }));
      destino.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    });
  }
}
