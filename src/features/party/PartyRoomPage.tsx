import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, extraerMensajeError } from '../../lib/api';
import { exportarConMarca } from '../../lib/marcaAgua';
import { stompService } from '../../lib/stompClient';
import { useAuthStore } from '../../lib/authStore';
import { Button } from '../../components/ui/Button';
import { dibujarBorrado, dibujarPunto, dibujarSegmento, dibujarTrazoCompleto, type EstiloPincel } from '../../lib/canvasEngine';
import { type Herramienta, type HerramientaFiesta } from '../canvas/BrushToolbar';
import { RielHerramientas, cerrarRielAlDibujar } from '../canvas/RielHerramientas';
import { PublishWizard } from '../feed/PublishWizard';
import { Modal } from '../../components/ui/Modal';
import { CodigoSalaBadge } from './CodigoSalaBadge';
import { CursorRemoto } from '../canvas/CursorRemoto';
import { generarUUID } from '../../lib/uuid';
import type { EstadoRondaResponse, PartyEvento, PartyTrazoDto, Punto, SalaFiestaResponse, TipoPincel } from '../../types';

interface TrazoRemotoEnProgreso {
  estilo: EstiloPincel;
  esBorrador: boolean;
  puntos: Punto[];
  ultimoPunto: Punto | null;
}

interface TrazoLocalPendiente {
  id: string;
  estilo: EstiloPincel;
  esBorrador: boolean;
  puntos: Punto[];
  creadoEn: number;
}

interface TrazoPropioActivo {
  id: string;
  estilo: EstiloPincel;
  esBorrador: boolean;
  puntos: Punto[];
  pendientes: Punto[];
}

export interface CursorRemoto {
  autorId: string;
  autorNombre: string;
  colorHex: string;
  tipoPincel: string;
  esBorrador: boolean;
  x: number;
  y: number;
  actualizadoEn: number;
}

export function PartyRoomPage() {
  const { id: salaId } = useParams<{ id: string }>();
  const sesion = useAuthStore((s) => s.sesion);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dimRef = useRef<{ ancho: number; alto: number }>({ ancho: 1200, alto: 800 });

  const [sala, setSala] = useState<SalaFiestaResponse | null>(null);
  const [estado, setEstado] = useState<EstadoRondaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  // Estados del flujo de rondas y fin de partida
  const [juegoFinalizado, setJuegoFinalizado] = useState(false);
  const [iniciandoRonda, setIniciandoRonda] = useState(false);
  const [previewFinalUrl, setPreviewFinalUrl] = useState<string | null>(null);
  const [totalTrazos, setTotalTrazos] = useState(0);

  // Cursores remotos en tiempo real con nombre
  const [cursoresRemotos, setCursoresRemotos] = useState<Record<string, CursorRemoto>>({});

  // Exclusión mutua de herramientas: solo 1 persona por herramienta a la vez
  const [herramientasTomadas, setHerramientasTomadas] = useState<Record<string, string>>({});
  const [miHerramienta, setMiHerramienta] = useState<HerramientaFiesta | null>(null);
  const [herramientaEstilo, setHerramientaEstilo] = useState<Herramienta>({
    tipoPincel: 'LAPIZ',
    colorHex: '#FF6B57',
    grosor: 20,
    opacidad: 1,
  });

  // Modal para publicar directamente desde el lienzo
  const [modalPublicar, setModalPublicar] = useState(false);
  const [archivoPublicar, setArchivoPublicar] = useState<File | null>(null);

  // Estado del riel lateral en móvil y del menú compacto de cabecera
  const [rielAbiertoMovil, setRielAbiertoMovil] = useState(false);
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);
  const menuAccionesRef = useRef<HTMLDivElement>(null);

  const trazosRef = useRef<Map<number, PartyTrazoDto>>(new Map());
  const maxSecuenciaRef = useRef(0);
  const propioTrazoRef = useRef<TrazoPropioActivo | null>(null);
  const trazosLocalesPendientesRef = useRef<TrazoLocalPendiente[]>([]);
  const remotosRef = useRef<Map<string, TrazoRemotoEnProgreso>>(new Map());
  const redibujadoProgramadoRef = useRef(false);
  const relojRef = useRef<{ recibidoEn: number; msRestantes: number }>({ recibidoEn: 0, msRestantes: 0 });
  const enRondaRef = useRef(false);
  const ultimoEnvioRef = useRef<number>(0);

  const esAnfitrion = !!(sala && sesion && sala.anfitrionNombre === sesion.nombreArtista);
  const enRonda = estado?.estadoSala === 'EN_RONDA';
  const totalRondas = estado?.totalRondas ?? sala?.totalRondas ?? 3;
  const numeroRonda = estado?.numeroRonda ?? sala?.numeroRonda ?? 0;
  const terminado = juegoFinalizado || estado?.estadoSala === 'CERRADA' || (!enRonda && numeroRonda >= totalRondas && numeroRonda > 0);
  const enEsperaInicial = !terminado && !enRonda && numeroRonda === 0;
  const enIntermision = !terminado && !enRonda && numeroRonda > 0 && numeroRonda < totalRondas;

  const redibujarTodo = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { ancho, alto } = dimRef.current;
    ctx.clearRect(0, 0, ancho, alto);
    ctx.fillStyle = '#F5F1EA';
    ctx.fillRect(0, 0, ancho, alto);

    // 1. Trazos confirmados por el servidor (orden secuencial estricto)
    const ordenados = [...trazosRef.current.values()].sort((a, b) => a.secuencia - b.secuencia);
    for (const t of ordenados) {
      if (t.borrador) {
        dibujarBorrado(ctx, t.puntos, t.grosor || 40, ancho, alto);
      } else if (t.tipoPincel) {
        dibujarTrazoCompleto(
          ctx,
          { tipoPincel: t.tipoPincel, colorHex: t.colorHex ?? '#0B0912', grosor: t.grosor, opacidad: t.opacidad },
          t.puntos,
          ancho,
          alto,
        );
      }
    }

    // 2. Trazos locales pendientes de confirmación del servidor (in-flight optimistas)
    for (const p of trazosLocalesPendientesRef.current) {
      if (p.esBorrador) {
        dibujarBorrado(ctx, p.puntos, p.estilo.grosor || 40, ancho, alto);
      } else {
        dibujarTrazoCompleto(ctx, p.estilo, p.puntos, ancho, alto);
      }
    }

    // 3. Trazos remotos en progreso de otros usuarios
    for (const r of remotosRef.current.values()) {
      if (r.puntos.length > 0) {
        if (r.esBorrador) {
          dibujarBorrado(ctx, r.puntos, r.estilo.grosor || 40, ancho, alto);
        } else {
          dibujarTrazoCompleto(ctx, r.estilo, r.puntos, ancho, alto);
        }
      }
    }

    // 4. Trazo propio actualmente en trazado (mientras arrastra el puntero en este instante)
    const propio = propioTrazoRef.current;
    if (propio && propio.puntos.length > 0) {
      if (propio.esBorrador) {
        dibujarBorrado(ctx, propio.puntos, propio.estilo.grosor || 40, ancho, alto);
      } else {
        dibujarTrazoCompleto(ctx, propio.estilo, propio.puntos, ancho, alto);
      }
    }
  }, []);

  const solicitarRedibujado = useCallback(() => {
    if (redibujadoProgramadoRef.current) return;
    redibujadoProgramadoRef.current = true;
    requestAnimationFrame(() => {
      redibujadoProgramadoRef.current = false;
      redibujarTodo();
    });
  }, [redibujarTodo]);

  // Adaptación dinámica del lienzo a la pantalla completa restante
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function ajustarDimensiones() {
      if (!container || !canvas) return;
      const ancho = Math.max(300, Math.floor(container.clientWidth));
      const alto = Math.max(300, Math.floor(container.clientHeight));
      if (canvas.width !== ancho || canvas.height !== alto) {
        canvas.width = ancho;
        canvas.height = alto;
        dimRef.current = { ancho, alto };
        ctxRef.current = canvas.getContext('2d');
        redibujarTodo();
      }
    }

    ajustarDimensiones();
    const observer = new ResizeObserver(() => {
      ajustarDimensiones();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [redibujarTodo]);

  const cargarEstado = useCallback(async () => {
    if (!salaId) return;
    try {
      const { data } = await api.get<EstadoRondaResponse>(`/api/fiestas/${salaId}/estado`);
      setEstado(data);
      enRondaRef.current = data.estadoSala === 'EN_RONDA';
      relojRef.current = { recibidoEn: performance.now(), msRestantes: data.msRestantes };
      const tot = data.totalRondas ?? 3;
      if (data.estadoSala === 'CERRADA' || (data.numeroRonda >= tot && data.estadoSala !== 'EN_RONDA' && data.numeroRonda > 0)) {
        setJuegoFinalizado(true);
      }
      for (const t of data.trazos) {
        trazosRef.current.set(t.secuencia, t);
        maxSecuenciaRef.current = Math.max(maxSecuenciaRef.current, t.secuencia);
      }
      setTotalTrazos(data.trazos.length);
      redibujarTodo();

      // Consultar herramientas tomadas en la sala
      const respHerramientas = await api.get<Record<string, string>>(`/api/fiestas/${salaId}/herramientas`).catch(() => null);
      if (respHerramientas?.data) {
        setHerramientasTomadas(respHerramientas.data);
        const entradaPropia = Object.entries(respHerramientas.data).find(([, autor]) => autor === sesion?.nombreArtista);
        if (entradaPropia) {
          const her = entradaPropia[0] as HerramientaFiesta;
          setMiHerramienta(her);
          if (her !== 'BORRADOR') {
            setHerramientaEstilo((prev) => ({ ...prev, tipoPincel: her as TipoPincel }));
          }
        }
      }
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo sincronizar la sala'));
    }
  }, [salaId, redibujarTodo, sesion?.nombreArtista]);

  // Capturar vista previa al finalizar la partida
  useEffect(() => {
    if (terminado && canvasRef.current) {
      try {
        setPreviewFinalUrl(canvasRef.current.toDataURL('image/png'));
        setTotalTrazos(trazosRef.current.size);
      } catch {
        // Ignorar
      }
    }
  }, [terminado]);

  // Limpieza automática de cursores remotos inactivos
  useEffect(() => {
    const timer = setInterval(() => {
      const ahora = Date.now();
      setCursoresRemotos((prev) => {
        let cambiado = false;
        const copia: Record<string, CursorRemoto> = {};
        for (const [id, c] of Object.entries(prev)) {
          if (ahora - c.actualizadoEn <= 2200) {
            copia[id] = c;
          } else {
            cambiado = true;
          }
        }
        return cambiado ? copia : prev;
      });
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // Conexión en tiempo real vía STOMP
  useEffect(() => {
    if (!salaId || !sesion) return;

    api
      .get<SalaFiestaResponse>(`/api/fiestas/${salaId}`)
      .then((r) => setSala(r.data))
      .catch(() => {});

    stompService.conectar(sesion.accessToken);

    const desuscribir = stompService.suscribir<PartyEvento>(`/topic/fiesta/${salaId}`, (evento) => {
      const ctx = ctxRef.current;
      const { ancho, alto } = dimRef.current;

      if (evento.tipo === 'TICK') {
        relojRef.current = { recibidoEn: performance.now(), msRestantes: evento.msRestantes ?? 0 };
        if (!enRondaRef.current) {
          enRondaRef.current = true;
          cargarEstado();
        }
      } else if (evento.tipo === 'RONDA_TERMINADA') {
        enRondaRef.current = false;
        cargarEstado();
      } else if (evento.tipo === 'JUEGO_TERMINADO') {
        enRondaRef.current = false;
        setJuegoFinalizado(true);
        cargarEstado();
      } else if (evento.tipo === 'HERRAMIENTA_TOMADA' && evento.herramienta && evento.propietarioHerramienta) {
        setHerramientasTomadas((prev) => ({
          ...prev,
          [evento.herramienta!]: evento.propietarioHerramienta!,
        }));
        if (evento.propietarioHerramienta === sesion.nombreArtista) {
          const her = evento.herramienta as HerramientaFiesta;
          setMiHerramienta(her);
          if (her !== 'BORRADOR') {
            setHerramientaEstilo((prev) => ({ ...prev, tipoPincel: her as TipoPincel }));
          }
        }
      } else if (evento.tipo === 'HERRAMIENTA_LIBERADA' && evento.herramienta) {
        setHerramientasTomadas((prev) => {
          const copia = { ...prev };
          delete copia[evento.herramienta!];
          return copia;
        });
        setMiHerramienta((actual) => (actual === evento.herramienta ? null : actual));
      } else if (evento.tipo === 'BORRADOR_TOMADO') {
        setHerramientasTomadas((prev) => ({
          ...prev,
          BORRADOR: evento.propietarioBorrador ?? 'alguien',
        }));
        if (evento.propietarioBorrador === sesion.nombreArtista) {
          setMiHerramienta('BORRADOR');
        }
      } else if (evento.tipo === 'BORRADOR_LIBERADO') {
        setHerramientasTomadas((prev) => {
          const copia = { ...prev };
          delete copia.BORRADOR;
          return copia;
        });
        setMiHerramienta((actual) => (actual === 'BORRADOR' ? null : actual));
      } else if (evento.tipo === 'TRAZO' && evento.trazo) {
        remotosRef.current.delete(`${evento.trazo.autorId}_party`);
        trazosRef.current.set(evento.trazo.secuencia, evento.trazo);
        maxSecuenciaRef.current = Math.max(maxSecuenciaRef.current, evento.trazo.secuencia);
        setCursoresRemotos((prev) => {
          if (!prev[evento.trazo!.autorId]) return prev;
          const copia = { ...prev };
          delete copia[evento.trazo!.autorId];
          return copia;
        });

        // Si es trazo propio, reconciliar la lista de pendientes locales (in-flight)
        if (evento.trazo.autorId === sesion.usuarioId) {
          const ahora = Date.now();
          const idx = trazosLocalesPendientesRef.current.findIndex(
            (p) => p.esBorrador === evento.trazo!.borrador,
          );
          if (idx >= 0) {
            trazosLocalesPendientesRef.current.splice(idx, 1);
          } else if (trazosLocalesPendientesRef.current.length > 0) {
            trazosLocalesPendientesRef.current.shift();
          }
          trazosLocalesPendientesRef.current = trazosLocalesPendientesRef.current.filter(
            (p) => ahora - p.creadoEn < 8000,
          );
        }

        // Siempre solicitar redibujado ordenado para garantizar composición 100% consistente
        solicitarRedibujado();
      } else if (evento.tipo === 'TRAZO_PARCIAL' && evento.trazo && ctx) {
        // Trazado en progreso en tiempo real de otro participante
        if (evento.trazo.autorId === sesion.usuarioId) return;

        const puntos = evento.trazo.puntos;
        if (puntos && puntos.length > 0) {
          const ultimoPunto = puntos[puntos.length - 1];
          setCursoresRemotos((prev) => ({
            ...prev,
            [evento.trazo!.autorId]: {
              autorId: evento.trazo!.autorId,
              autorNombre: evento.trazo!.autorNombre || 'Artista',
              colorHex: evento.trazo!.colorHex ?? '#FF6B57',
              tipoPincel: evento.trazo!.borrador ? 'Borrador' : (evento.trazo!.tipoPincel ?? 'Lápiz'),
              esBorrador: evento.trazo!.borrador,
              x: ultimoPunto.x,
              y: ultimoPunto.y,
              actualizadoEn: Date.now(),
            },
          }));
        }

        const clave = `${evento.trazo.autorId}_party`;
        let estadoRemoto = remotosRef.current.get(clave);
        if (!estadoRemoto) {
          estadoRemoto = {
            estilo: {
              tipoPincel: (evento.trazo.tipoPincel ?? 'LAPIZ') as TipoPincel,
              colorHex: evento.trazo.colorHex ?? '#0B0912',
              grosor: evento.trazo.grosor,
              opacidad: evento.trazo.opacidad,
            },
            esBorrador: evento.trazo.borrador,
            puntos: [],
            ultimoPunto: null,
          };
          remotosRef.current.set(clave, estadoRemoto);
        }
        for (const p of evento.trazo.puntos) {
          estadoRemoto.puntos.push(p);
          if (estadoRemoto.ultimoPunto) {
            if (estadoRemoto.esBorrador) {
              dibujarBorrado(ctx, [estadoRemoto.ultimoPunto, p], estadoRemoto.estilo.grosor || 40, ancho, alto);
            } else {
              dibujarSegmento(ctx, estadoRemoto.estilo, estadoRemoto.ultimoPunto, p, ancho, alto);
            }
          } else {
            if (!estadoRemoto.esBorrador) {
              dibujarPunto(ctx, estadoRemoto.estilo, p, ancho, alto);
            }
          }
          estadoRemoto.ultimoPunto = p;
        }
      }
    });

    cargarEstado()
      .catch((err) => setError(extraerMensajeError(err, 'No puedes entrar a esta sala')))
      .finally(() => setCargando(false));

    return desuscribir;
  }, [salaId, sesion, cargarEstado, solicitarRedibujado]);

  // Cerrar menú compacto de cabecera al tocar fuera o pulsar Escape
  useEffect(() => {
    if (!menuAccionesAbierto) return;
    function alPresionarFuera(e: PointerEvent) {
      if (menuAccionesRef.current && !menuAccionesRef.current.contains(e.target as Node)) {
        setMenuAccionesAbierto(false);
      }
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuAccionesAbierto(false);
    }
    document.addEventListener('pointerdown', alPresionarFuera);
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('pointerdown', alPresionarFuera);
      window.removeEventListener('keydown', alTeclear);
    };
  }, [menuAccionesAbierto]);

  function coordenadas(e: React.PointerEvent<HTMLCanvasElement>): Punto {
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / w)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / h)),
    };
  }

  function alPresionar(e: React.PointerEvent<HTMLCanvasElement>) {
    // Cerrar el riel en móvil al empezar a dibujar sobre el lienzo
    setRielAbiertoMovil(false);
    cerrarRielAlDibujar();

    if (terminado) {
      setAviso('🎉 La partida ha finalizado. Puedes publicar la obra colaborativa o descargarla.');
      setTimeout(() => setAviso(null), 3500);
      return;
    }
    if (enEsperaInicial) {
      setAviso('⏳ La partida aún no ha comenzado. El anfitrión debe iniciar la primera ronda.');
      setTimeout(() => setAviso(null), 3500);
      return;
    }
    if (!miHerramienta) {
      setAviso('⚠️ Selecciona primero una herramienta disponible en la barra arriba (1 persona por herramienta).');
      setTimeout(() => setAviso(null), 3500);
      return;
    }
    const punto = coordenadas(e);
    const { ancho, alto } = dimRef.current;
    const ctx = ctxRef.current;
    const id = generarUUID();
    const esBorrador = miHerramienta === 'BORRADOR';
    const estilo: EstiloPincel = {
      tipoPincel: esBorrador ? 'LAPIZ' : miHerramienta,
      colorHex: herramientaEstilo.colorHex,
      grosor: herramientaEstilo.grosor,
      opacidad: herramientaEstilo.opacidad,
    };
    propioTrazoRef.current = { id, estilo, esBorrador, puntos: [punto], pendientes: [punto] };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (ctx) {
      if (esBorrador) {
        dibujarBorrado(ctx, [punto], estilo.grosor || 40, ancho, alto);
      } else {
        dibujarPunto(ctx, estilo, punto, ancho, alto);
      }
    }

    enviarParcial([punto]);
  }

  function alMover(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = ctxRef.current;
    const actual = propioTrazoRef.current;
    if (!ctx || e.buttons !== 1 || !actual || !miHerramienta) return;
    const punto = coordenadas(e);
    const anterior = actual.puntos[actual.puntos.length - 1];
    const { ancho, alto } = dimRef.current;

    if (actual.esBorrador) {
      dibujarBorrado(ctx, [anterior, punto], actual.estilo.grosor || 40, ancho, alto);
    } else {
      dibujarSegmento(ctx, actual.estilo, anterior, punto, ancho, alto);
    }
    actual.puntos.push(punto);
    actual.pendientes.push(punto);

    const ahora = performance.now();
    if ((actual.pendientes.length >= 2 || ahora - ultimoEnvioRef.current > 25) && salaId) {
      enviarParcial(actual.pendientes);
      actual.pendientes = [punto];
      ultimoEnvioRef.current = ahora;
    }
  }

  function alSoltar() {
    const actual = propioTrazoRef.current;
    propioTrazoRef.current = null;
    if (!actual || !salaId || !miHerramienta) return;

    if (actual.pendientes.length > 1) {
      enviarParcial(actual.pendientes);
    }

    // Registrar en pendientes locales para que jamás se borre en redibujados concurrentes
    trazosLocalesPendientesRef.current.push({
      id: actual.id,
      estilo: actual.estilo,
      esBorrador: actual.esBorrador,
      puntos: [...actual.puntos],
      creadoEn: Date.now(),
    });

    if (actual.esBorrador) {
      stompService.publicar(`/app/fiesta/${salaId}/borrar`, {
        puntos: actual.puntos,
        grosor: actual.estilo.grosor || 40,
      });
    } else {
      stompService.publicar(`/app/fiesta/${salaId}/trazo`, {
        tipoPincel: actual.estilo.tipoPincel,
        colorHex: actual.estilo.colorHex,
        grosor: actual.estilo.grosor,
        opacidad: actual.estilo.opacidad,
        puntos: actual.puntos,
      });
    }
  }

  function enviarParcial(puntos: Punto[]) {
    if (!salaId || !miHerramienta) return;
    stompService.publicar(`/app/fiesta/${salaId}/parcial`, {
      tipoPincel: miHerramienta === 'BORRADOR' ? null : miHerramienta,
      colorHex: herramientaEstilo.colorHex,
      grosor: herramientaEstilo.grosor,
      opacidad: herramientaEstilo.opacidad,
      puntos,
    });
  }

  // Tomar exclusivamente una herramienta o borrador
  async function tomarHerramientaFiesta(tipo: HerramientaFiesta) {
    if (!salaId || !sesion) return;

    // Si ya la tiene, soltarla para liberarla a los compañeros
    if (miHerramienta === tipo) {
      try {
        await api.delete(`/api/fiestas/${salaId}/herramientas/${tipo}`);
        setMiHerramienta(null);
        setHerramientasTomadas((prev) => {
          const copia = { ...prev };
          delete copia[tipo];
          return copia;
        });
      } catch (err) {
        setAviso(extraerMensajeError(err));
      }
      return;
    }

    try {
      // Liberar la herramienta anterior si tenía una tomada
      if (miHerramienta) {
        await api.delete(`/api/fiestas/${salaId}/herramientas/${miHerramienta}`).catch(() => {});
      }

      // Bloquear exclusivamente la nueva herramienta
      const { data } = await api.post<{ tomado: boolean; herramienta: string; propietarioNombre: string }>(
        `/api/fiestas/${salaId}/herramientas/${tipo}`,
      );

      if (data.tomado) {
        setMiHerramienta(tipo);
        setHerramientasTomadas((prev) => ({ ...prev, [tipo]: sesion.nombreArtista }));
        if (tipo !== 'BORRADOR') {
          setHerramientaEstilo((prev) => ({ ...prev, tipoPincel: tipo as TipoPincel }));
        }
      } else {
        setAviso(`🔒 La herramienta ${tipo} está en uso por ${data.propietarioNombre}`);
        setTimeout(() => setAviso(null), 3500);
      }
    } catch (err) {
      setAviso(extraerMensajeError(err));
      setTimeout(() => setAviso(null), 3500);
    }
  }

  async function iniciarRonda() {
    if (!salaId) return;
    setIniciandoRonda(true);
    try {
      await api.post(`/api/fiestas/${salaId}/rondas`);
    } catch (err) {
      setAviso(extraerMensajeError(err));
      setTimeout(() => setAviso(null), 3000);
    } finally {
      setIniciandoRonda(false);
    }
  }

  // Publicar obra directamente desde la sala fiesta
  function abrirPublicar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const archivo = new File([blob], `fiesta-${sala?.codigo || 'obra'}-${Date.now()}.png`, { type: 'image/png' });
      setArchivoPublicar(archivo);
      setModalPublicar(true);
    }, 'image/png');
  }

  // Descarga de snapshot PNG
  function descargarSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const enlace = document.createElement('a');
    enlace.download = `fiesta-${sala?.codigo || 'obra'}.png`;
    enlace.href = exportarConMarca(canvas, '© Modo fiesta · Artagram');
    enlace.click();
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-coral-light">{error}</p>
        <Link to="/fiesta" className="btn-secondary mt-4">
          Volver al lobby
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--alto-barra))] flex-col p-2 sm:p-3 gap-2 overflow-hidden select-none">
      {/* Cabecera del modo fiesta: una sola fila en móvil, completa en sm+ */}
      <header className="flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            to="/fiesta"
            className="btn-ghost flex-shrink-0 text-xs px-2.5 py-1.5 sm:px-3"
            title="Salir de la sala"
          >
            ← Salir
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <h1 className="truncate font-display text-sm sm:text-lg font-semibold tracking-tight text-paper">
                Sala de {sala?.anfitrionNombre ?? '…'}
              </h1>
              {sala && <CodigoSalaBadge codigo={sala.codigo} compacto />}
              <span className="chip flex-shrink-0 px-2 py-0.5 text-[11px]">
                {sala?.totalParticipantes ?? 1} artista(s)
              </span>
            </div>
            <p className="text-[11px] text-paper-dim hidden sm:block">
              Panel estilo Paint exclusivo · 1 persona por herramienta en tiempo real
            </p>
          </div>
        </div>

        {/* Acciones de cabecera en sm+ */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {numeroRonda > 0 && <SegmentosRonda actual={numeroRonda} total={totalRondas} enRonda={enRonda} />}

          {esAnfitrion && !terminado && (
            <Button
              type="button"
              onClick={iniciarRonda}
              cargando={iniciandoRonda}
              className="text-xs px-3 py-1.5"
              title="Iniciar o avanzar a la siguiente ronda"
            >
              {enEsperaInicial
                ? 'Empezar'
                : enIntermision
                  ? 'Siguiente ronda →'
                  : 'Reiniciar ronda'}
            </Button>
          )}

          <button
            type="button"
            onClick={descargarSnapshot}
            className="btn-secondary text-xs px-3 py-1.5"
            title="Descargar snapshot PNG"
          >
            Descargar PNG
          </button>

          <button
            type="button"
            onClick={abrirPublicar}
            className="btn-primary text-xs px-3.5 py-1.5"
            title="Publicar esta obra colaborativa directamente en el Feed"
          >
            Publicar obra
          </button>
        </div>

        {/* Menú compacto "⋯" visible solo en <sm */}
        <div ref={menuAccionesRef} className="relative flex sm:hidden items-center flex-shrink-0">
          <button
            type="button"
            aria-label="Más acciones de la sala"
            aria-expanded={menuAccionesAbierto}
            aria-haspopup="menu"
            onClick={() => setMenuAccionesAbierto((v) => !v)}
            className="btn-ghost h-9 w-9 min-h-[36px] min-w-[36px] p-0 text-base leading-none"
            title="Más acciones"
          >
            ⋯
          </button>

          <AnimatePresence>
            {menuAccionesAbierto && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className="panel-flotante absolute right-0 top-full z-40 mt-1.5 flex w-52 flex-col gap-1 p-2"
              >
                {numeroRonda > 0 && (
                  <div className="border-b border-paper/10 px-2.5 py-1 text-[11px] font-medium text-paper-muted">
                    Ronda {numeroRonda} de {totalRondas}
                  </div>
                )}

                {esAnfitrion && !terminado && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={iniciandoRonda}
                    onClick={() => {
                      setMenuAccionesAbierto(false);
                      void iniciarRonda();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-coral hover:bg-paper/10"
                  >
                    {enEsperaInicial
                      ? '▶ Empezar'
                      : enIntermision
                        ? '⏭ Siguiente ronda →'
                        : '↻ Reiniciar ronda'}
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuAccionesAbierto(false);
                    descargarSnapshot();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-paper hover:bg-paper/10"
                >
                  ⬇ Descargar PNG
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuAccionesAbierto(false);
                    abrirPublicar();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-teal hover:bg-paper/10"
                >
                  ✨ Publicar obra
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Alerta de notificación o estado de herramientas */}
      <AnimatePresence>
        {aviso && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="banner-aviso flex items-center justify-between py-1.5 text-xs"
          >
            <span>{aviso}</span>
            <button type="button" onClick={() => setAviso(null)} className="ml-2 text-paper-muted hover:text-paper">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!enEsperaInicial && !terminado && (
        <div className="flex items-end justify-between gap-4 px-1">
          <div className="min-w-0">
            <p className="label">Tu herramienta</p>
            <p className="acento truncate text-2xl leading-tight sm:text-4xl">
              {miHerramienta ? miHerramienta.toLowerCase().replace(/_/g, ' ') : 'elige una'}
            </p>
          </div>
          {/* Cronómetro aislado que no re-renderiza el lienzo ni la página */}
          <CronometroRonda
            relojRef={relojRef}
            enRonda={enRonda}
            numeroRonda={numeroRonda}
            totalRondas={totalRondas}
            terminado={terminado}
          />
        </div>
      )}

      {/* Contenedor responsivo con la forma de la pantalla para el lienzo colaborativo de fiesta */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full min-h-0 rounded-2xl border border-paper/10 bg-[#F5F1EA] overflow-hidden"
        style={{ cursor: miHerramienta ? 'crosshair' : 'default' }}
      >
        {cargando && (
          <div role="status" className="skeleton absolute inset-0 z-10 grid place-items-center rounded-none">
            <p className="text-xs text-paper-muted">Sincronizando sala fiesta…</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none select-none"
          style={{ cursor: miHerramienta ? 'crosshair' : 'default' }}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerLeave={alSoltar}
        />

        {/* Riel lateral ocultable sobre el lienzo (exclusividad de 1 persona por herramienta) */}
        <RielHerramientas
          herramienta={herramientaEstilo}
          onCambiar={setHerramientaEstilo}
          modoFiesta={true}
          herramientasTomadas={herramientasTomadas}
          usuarioActualNombre={sesion?.nombreArtista}
          herramientaActivaFiesta={miHerramienta}
          onTomarHerramienta={tomarHerramientaFiesta}
          deshabilitado={false}
          abiertoMovil={rielAbiertoMovil}
          onCambiarAbierto={setRielAbiertoMovil}
          claveMemoria="fiesta"
        />

        {/* Capa de cursores e indicadores flotantes en tiempo real con nombre */}
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {Object.values(cursoresRemotos).map((cursor) => (
            <CursorRemoto
              key={cursor.autorId}
              x={cursor.x}
              y={cursor.y}
              colorHex={cursor.colorHex}
              nombre={cursor.autorNombre}
              detalle={cursor.tipoPincel}
              esBorrador={cursor.esBorrador}
            />
          ))}
        </div>

        {/* Pantalla de inicio / sala de espera previa a la primera ronda */}
        {enEsperaInicial && !cargando && (
          <div className="scrim absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card card-fija borde-fiesta flex w-full max-w-sm flex-col items-center gap-4 p-6"
            >
              <h2 className="font-display text-[32px] font-semibold leading-tight text-paper">
                Sala de <span className="acento">espera</span>
              </h2>
              {sala && <CodigoSalaBadge codigo={sala.codigo} />}

              <div className="w-full space-y-2 rounded-xl border border-paper/10 bg-paper/5 p-3 text-xs text-paper-muted">
                <div className="flex justify-between items-center">
                  <span>Total de rondas:</span>
                  <span className="font-semibold text-paper">{totalRondas} rondas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tiempo por ronda:</span>
                  <span className="font-semibold text-paper">{sala?.duracionRondaSegundos ?? 60}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Participantes:</span>
                  <span className="font-semibold text-paper">
                    {sala?.totalParticipantes ?? 1} / {sala?.cupoMaximo ?? 8}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Anfitrión:</span>
                  <span className="font-semibold text-paper">{sala?.anfitrionNombre}</span>
                </div>
              </div>

              {esAnfitrion ? (
                <Button
                  type="button"
                  onClick={iniciarRonda}
                  cargando={iniciandoRonda}
                  className="w-full"
                >
                  Empezar
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-paper-muted">
                  <span className="punto-vivo" aria-hidden />
                  <span>Esperando a que {sala?.anfitrionNombre} inicie la ronda 1...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Banner de intermisión entre rondas */}
        {enIntermision && !cargando && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="card card-fija borde-pro flex items-center gap-4 px-5 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-semibold text-paper">
                    ¡Ronda {numeroRonda} de {totalRondas} finalizada!
                  </span>
                </div>
                <p className="text-[11px] text-paper-dim">Prepara tu próximo trazo con tu herramienta asignada.</p>
              </div>
              {esAnfitrion ? (
                <Button
                  type="button"
                  onClick={iniciarRonda}
                  cargando={iniciandoRonda}
                  className="whitespace-nowrap px-3 py-1.5 text-xs"
                >
                  Siguiente ronda →
                </Button>
              ) : (
                <span className="whitespace-nowrap text-xs text-paper-muted">
                  Esperando al anfitrión...
                </span>
              )}
            </motion.div>
          </div>
        )}

        {/* Pantalla final de la partida al completar todas las rondas */}
        {terminado && !cargando && (
          <div className="scrim absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card card-fija borde-fiesta flex w-full max-w-lg flex-col items-center gap-4 p-6 text-center"
            >
              <div>
                <h2 className="font-display text-[32px] font-semibold leading-tight text-paper">
                  ¡Partida <span className="acento">finalizada</span>!
                </h2>
                <p className="text-xs text-paper-dim mt-1">
                  Se completaron las <span className="text-paper font-semibold">{totalRondas} rondas</span> colaborativas.
                </p>
              </div>

              {/* Vista previa de la obra completada */}
              <div className="w-full max-h-56 overflow-hidden rounded-xl border border-paper/10 bg-[#F5F1EA] flex items-center justify-center p-1">
                {previewFinalUrl ? (
                  <img
                    src={previewFinalUrl}
                    alt="Obra colaborativa final"
                    className="max-h-52 object-contain rounded-lg"
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-paper-dim">
                    Lienzo colaborativo finalizado
                  </div>
                )}
              </div>

              {/* Estadísticas de la partida */}
              <div className="grid grid-cols-3 gap-2 w-full text-xs">
                <div className="glass rounded-xl p-2.5">
                  <p className="text-paper-dim text-[10px]">Rondas</p>
                  <p className="font-display text-xl font-semibold text-paper">{totalRondas} / {totalRondas}</p>
                </div>
                <div className="glass rounded-xl p-2.5">
                  <p className="text-paper-dim text-[10px]">Trazos hechos</p>
                  <p className="font-display text-xl font-semibold text-paper">{totalTrazos}</p>
                </div>
                <div className="glass rounded-xl p-2.5">
                  <p className="text-paper-dim text-[10px]">Artistas</p>
                  <p className="font-display text-xl font-semibold text-paper">{sala?.totalParticipantes ?? 1}</p>
                </div>
              </div>

              {/* Botones de acción principales */}
              <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                <Button
                  type="button"
                  onClick={abrirPublicar}
                  className="flex-1"
                >
                  Publicar obra
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={descargarSnapshot}
                  className="flex-1"
                >
                  Descargar
                </Button>
              </div>

              <Link
                to="/fiesta"
                className="text-xs text-paper-dim hover:text-paper underline transition-colors pt-1"
              >
                Volver al lobby del Modo Fiesta
              </Link>
            </motion.div>
          </div>
        )}

        {/* Indicador de ayuda si no tiene herramienta seleccionada */}
        {!miHerramienta && !cargando && !enEsperaInicial && !terminado && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none glass rounded-full px-4 py-1.5 text-xs text-paper-muted">
            👆 Elige una de las herramientas disponibles arriba para comenzar a pintar
          </div>
        )}
      </div>

      {/* Modal para publicar obra directamente desde el modo fiesta */}
      {modalPublicar && (
        <Modal className="sm:max-w-2xl" onCerrar={() => setModalPublicar(false)}>
            <PublishWizard
              archivoInicial={archivoPublicar}
              onPublicado={(pub) => {
                setModalPublicar(false);
                setAviso(`¡Obra "${pub.titulo}" publicada con éxito en el Feed! 🎨`);
                setTimeout(() => setAviso(null), 5000);
              }}
              onCerrar={() => setModalPublicar(false)}
            />
        </Modal>
      )}
    </div>
  );
}

function CronometroRonda({
  relojRef,
  enRonda,
  numeroRonda,
  totalRondas,
  terminado,
}: {
  relojRef: React.RefObject<{ recibidoEn: number; msRestantes: number }>;
  enRonda: boolean;
  numeroRonda: number;
  totalRondas: number;
  terminado: boolean;
}) {
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (!enRonda) return;
    const actualizar = () => {
      const { recibidoEn, msRestantes } = relojRef.current;
      const transcurrido = performance.now() - recibidoEn;
      setMs(Math.max(0, msRestantes - transcurrido));
    };
    actualizar();
    const intervalo = setInterval(actualizar, 200);
    return () => clearInterval(intervalo);
  }, [enRonda, relojRef]);

  if (terminado) {
    return (
      <div className="rounded-xl border border-violet/50 bg-violet/15 px-3 py-1 font-display text-xs font-semibold text-violet">
        🏆 Partida finalizada ({totalRondas}/{totalRondas})
      </div>
    );
  }

  if (!enRonda) {
    if (numeroRonda === 0) {
      return (
        <div className="glass rounded-full px-3 py-1 text-xs font-medium text-paper-muted">
          ⏳ Esperando inicio · 0/{totalRondas} rondas
        </div>
      );
    }
    return (
      <div className="glass rounded-full px-3 py-1 text-xs font-medium text-amber">
        ⏸ Ronda {numeroRonda}/{totalRondas}
      </div>
    );
  }

  const segundos = Math.ceil(ms / 1000);
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');

  return (
    <div
      role="timer"
      aria-label={`Quedan ${segundos} segundos de la ronda ${numeroRonda} de ${totalRondas}`}
      className={`animate-latido font-display text-5xl font-semibold leading-none tabular-nums sm:text-[64px] ${segundos <= 10 ? 'text-coral' : 'text-paper'}`}
    >
      {mm}:{ss}
    </div>
  );
}

function SegmentosRonda({ actual, total, enRonda }: { actual: number; total: number; enRonda: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-xs font-medium text-paper-muted">
        Ronda {actual} de {total}
      </span>
      <div aria-hidden className="hidden gap-1 sm:flex">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full ${i + 1 > actual ? 'bg-paper/20' : 'bg-coral'} ${i + 1 === actual && enRonda ? 'animate-pulso-vivo' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
