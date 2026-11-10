export type TipoPincel = 'LAPIZ' | 'MARCADOR' | 'ACUARELA' | 'PLUMA' | 'AEROGRAFO';

export interface Punto {
  x: number;
  y: number;
}

export interface PerfilResponse {
  usuarioId: string;
  nombreArtista: string;
  biografia: string;
  fotoUrl: string | null;
  enlaces: { etiqueta: string; url: string }[];
  obrasDestacadas: { titulo: string; imagenUrl: string }[];
  esPropio: boolean;
  premium?: boolean;
}

export interface ComunidadResponse {
  id: string;
  nombre: string;
  descripcion: string;
  publica: boolean;
  creador: string;
  totalMiembros: number;
  miRol: string | null;
}

export interface MiembroComunidadDto {
  usuarioId: string;
  nombreArtista: string;
  rol: string;
  unidoEn: string;
}

export interface TrazoEvento {
  tipo: 'PARCIAL' | 'FINAL' | 'EDITADO';
  trazoEnProgresoId: string | null;
  secuencia: number | null;
  autorId: string;
  autorNombre: string;
  tipoPincel: TipoPincel;
  colorHex: string;
  grosor: number;
  opacidad: number;
  capa: number;
  puntos: Punto[];
  /** Id persistido del trazo (FINAL/EDITADO); trazoEnProgresoId es solo el temporal del cliente. */
  trazoId?: string | null;
}

export interface TrazoDto {
  id: string;
  secuencia: number;
  autorId: string;
  autorNombre: string;
  tipoPincel: TipoPincel;
  colorHex: string;
  grosor: number;
  opacidad: number;
  capa: number;
  puntos: Punto[];
  creadoEn: string;
}

export interface BloqueoTrazoResponse {
  tomado: boolean;
  propietarioNombre: string | null;
}

export interface BloqueoEvento {
  tipo: 'TOMADO' | 'LIBERADO';
  trazoId: string;
  propietarioNombre: string | null;
}

export interface RegionEstado {
  regionIndex: number;
  snapshotPngBase64: string | null;
  trazosDesdeSnapshot: BannerTrazoEvento[];
}

export interface BannerTrazoEvento {
  regionIndex: number;
  secuencia: number;
  autorId: string;
  autorNombre: string;
  tipoPincel: TipoPincel;
  colorHex: string;
  grosor: number;
  opacidad: number;
  puntos: Punto[];
}

export interface SalaFiestaResponse {
  id: string;
  codigo: string;
  anfitrionNombre: string;
  duracionRondaSegundos: number;
  cupoMaximo: number;
  estado: 'ESPERANDO' | 'EN_RONDA' | 'CERRADA';
  totalParticipantes: number;
  numeroRonda: number;
  totalRondas?: number;
}

export interface PartyTrazoDto {
  secuencia: number;
  autorId: string;
  autorNombre: string;
  borrador: boolean;
  tipoPincel: TipoPincel | null;
  colorHex: string | null;
  grosor: number;
  opacidad: number;
  puntos: Punto[];
}

export interface EstadoRondaResponse {
  estadoSala: string;
  numeroRonda: number;
  totalRondas?: number;
  msRestantes: number;
  pincel: TipoPincel | null;
  colorHex: string | null;
  grosor: number | null;
  opacidad: number | null;
  borradorPropietario: string | null;
  trazos: PartyTrazoDto[];
}

export interface PartyEvento {
  tipo:
    | 'TICK'
    | 'RONDA_TERMINADA'
    | 'JUEGO_TERMINADO'
    | 'BORRADOR_DISPONIBLE'
    | 'BORRADOR_TOMADO'
    | 'BORRADOR_LIBERADO'
    | 'HERRAMIENTA_TOMADA'
    | 'HERRAMIENTA_LIBERADA'
    | 'TRAZO'
    | 'TRAZO_PARCIAL';
  msRestantes: number | null;
  trazo: PartyTrazoDto | null;
  propietarioBorrador: string | null;
  herramienta?: string | null;
  propietarioHerramienta?: string | null;
}

export interface ConversacionResumenDto {
  contactoId: string;
  contactoNombre: string;
  ultimoMensaje: string;
  ultimoMensajeEn: string;
  entregado: boolean;
}

export interface MensajePersonalDto {
  id: string;
  remitenteId: string;
  remitenteNombre: string;
  destinatarioId: string;
  contenido: string;
  entregado: boolean;
  creadoEn: string;
}

export interface MensajeComunidadDto {
  id: string;
  remitenteId: string;
  remitenteNombre: string;
  contenido: string;
  creadoEn: string;
}

export interface ComentarioDto {
  id: string;
  publicacionId: string;
  autorId: string;
  autorNombre: string;
  contenido: string;
  creadoEn: string;
}

export interface LikeEvento {
  tipo: 'LIKES_ACTUALIZADOS';
  publicacionId: string;
  contadorLikes: number;
}

export interface ComentarioEvento {
  tipo: 'COMENTARIO_CREADO' | 'COMENTARIO_ELIMINADO';
  comentario: ComentarioDto;
  contadorComentarios: number;
}

/**
 * Respuesta de GET/POST /api/publicaciones/{id}/analisis (artagram-feed).
 * El POST devuelve el registro en PENDIENTE y el resultado llega despues por
 * ai.completed, asi que hay que volver a consultar hasta que cambie el estado.
 */
export interface AnalisisIaDto {
  id: string;
  publicacionId: string;
  estado: 'PENDIENTE' | 'COMPLETADO' | 'ERROR' | string;
  diagnosticoGeneral: string | null;
  puntosFuertes: string[] | null;
  areasMejora: string[] | null;
  consejos: string[] | null;
  scoreEstimado: number;
  paletaDetectada: string | null;
  composicion: string | null;
  creadoEn: string;
}

export interface SugerenciaEtiquetasResultado {
  tituloSugerido: string;
  descripcionSugerida: string;
  etiquetas: string[];
}

export interface PublicacionDto {
  id: string;
  autorId: string;
  autorNombre: string;
  titulo: string;
  descripcion: string;
  obraFinalUrl: string;
  imagenesProcesoUrls: string[];
  etiquetas: string[];
  contadorLikes: number;
  meGusta: boolean;
  creadoEn: string;
  contadorComentarios?: number;
  version?: number;
  editadoEn?: string | null;
}

export interface LikeResponse {
  meGusta: boolean;
  contadorLikes: number;
}

export interface ArtistaResumen {
  usuarioId: string;
  nombreArtista: string;
  loSigo: boolean;
  seguidores: number;
}

export interface Seguimiento {
  loSigo: boolean;
  seguidores: number;
}

export interface FeedResponse {
  publicaciones: PublicacionDto[];
  cursorFechaSiguiente: string | null;
  cursorIdSiguiente: string | null;
  hayMas: boolean;
  artistasSugeridos: string[];
}

/** GET /api/suscripcion/actual (artagram-payment). */
export interface SuscripcionDto {
  plan: 'GRATIS' | 'PRO' | string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  premium: boolean;
  megabytesUsados: number;
  maxMegabytes: number;
  obrasSubidas: number;
  maxObras: number;
}

/** POST /api/suscripcion/checkout: checkoutUrl es la página del proveedor (o el retorno directo si es simulado). */
export interface CheckoutResponse {
  checkoutUrl: string;
  idTransaccion: string;
  proveedor: string;
}

// --- Funciones que esperan backend: ver docs/CONTRATO_FUNCIONES_PENDIENTES.md ---

export type MotivoReporte = 'SPAM' | 'CONTENIDO_INAPROPIADO' | 'PLAGIO' | 'ACOSO' | 'OTRO';

export interface ReporteDto {
  id: string;
  publicacionId: string;
  publicacionTitulo: string;
  obraUrl: string;
  autorNombre: string;
  reportanteNombre: string;
  motivo: MotivoReporte;
  detalle: string | null;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'DESCARTADO';
  creadoEn: string;
}

export interface ArtistaDibujandoDto {
  usuarioId: string;
  nombreArtista: string;
  lugar: 'LIENZO' | 'FIESTA';
  comunidadId: string | null;
  comunidadNombre: string | null;
  salaId: string | null;
  desde: string;
}

export interface PresenciaEvento {
  tipo: 'EMPEZO_A_DIBUJAR' | 'DEJO_DE_DIBUJAR';
  artista: ArtistaDibujandoDto;
}

export interface ComunidadRecomendadaDto extends ComunidadResponse {
  motivo: string;
}

export type TipoNotificacion =
  | 'NUEVO_SEGUIDOR'
  | 'NUEVO_LIKE'
  | 'NUEVO_COMENTARIO'
  | 'SUSCRIPCION_PREMIUM'
  | 'ANALISIS_IA_LISTO'
  | 'MENSAJE_DIRECTO';

export interface NotificacionDto {
  id: string;
  destinatarioId: string;
  tipo: TipoNotificacion | string;
  actorId: string | null;
  actorNombre: string | null;
  referenciaId: string | null;
  mensaje: string;
  leida: boolean;
  creadoEn: string;
}

export interface KpiDetalle {
  id: string;
  nombre: string;
  valorActual: number;
  meta: number;
  tendencia: 'SUBE' | 'BAJA' | 'IGUAL';
  formula: string;
  periodoDesde: string;
  periodoHasta: string;
  cantidadEventosContados: number;
}
