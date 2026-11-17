import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { dibujar, emitir, escribir, esperar, esperarQue, montar, OTRO, prepararEntorno, publicacion, propia, pulsarTodo, teclas, trazoLienzo, trazoParty, YO } from './arnes';
import { CanvasStudioPage } from '../features/canvas/CanvasStudioPage';
import { PartyRoomPage } from '../features/party/PartyRoomPage';
import { PartyLobbyPage } from '../features/party/PartyLobbyPage';
import { CommunityBannerMural } from '../features/community/CommunityBannerMural';
import { PostCard } from '../features/feed/PostCard';
import { PersonalChatPage } from '../features/chat/PersonalChatPage';
import { DibujandoAhora } from '../features/feed/DibujandoAhora';
import { CommunityAdminPanel } from '../features/community/CommunityAdminPanel';
import { PublishWizard } from '../features/feed/PublishWizard';
import { ProfilePage } from '../features/profile/ProfilePage';
import { LoginPage } from '../features/auth/LoginPage';
import { CommunityListPage } from '../features/community/CommunityListPage';
import { CommunityDetailPage } from '../features/community/CommunityDetailPage';
import { BuscarArtistas } from '../features/feed/BuscarArtistas';
import { AppShell } from '../components/layout/AppShell';
import { SuscripcionResultadoPage } from '../features/suscripcion/SuscripcionResultadoPage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { ComunidadesRecomendadas } from '../features/community/ComunidadesRecomendadas';
import { ComunidadChatPanel } from '../features/chat/ComunidadChatPanel';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { ModalReportar } from '../features/moderacion/ModalReportar';
import { ObraPage } from '../features/feed/ObraPage';
import { BannerMuralPage } from '../features/canvas/BannerMuralPage';
import { LandingPage } from '../features/auth/LandingPage';
import { AdminRoute } from '../components/layout/AdminRoute';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { useAuthStore } from '../lib/authStore';
import { api } from '../lib/api';
import { stompService } from '../lib/stompClient';

vi.mock('@microsoft/fetch-event-source', () => ({ fetchEventSource: vi.fn(() => new Promise(() => {})) }));

beforeEach(() => prepararEntorno());
afterEach(() => vi.restoreAllMocks());

describe('paginas principales', () => {
  it('estudio del lienzo colaborativo', async () => {
    const m = await montar(<CanvasStudioPage />, '/comunidades/c1/lienzo', '/comunidades/:id/lienzo');
    await dibujar(m.contenedor);
    const evento = { ...trazoLienzo, trazoEnProgresoId: 'x1', trazoId: 't9', autorId: OTRO, autorNombre: 'sam' };
    await emitir('/topic/lienzo/c1', { ...evento, tipo: 'PARCIAL' });
    await emitir('/topic/lienzo/c1', { ...evento, tipo: 'FINAL', secuencia: 3 });
    await emitir('/topic/lienzo/c1', { ...evento, tipo: 'EDITADO', secuencia: 3 });
    await emitir('/topic/lienzo/c1/bloqueos', { tipo: 'TOMADO', trazoId: 't2', propietarioNombre: 'sam' });
    await emitir('/topic/lienzo/c1/bloqueos', { tipo: 'LIBERADO', trazoId: 't2', propietarioNombre: null });
    await teclas(window, ['b', 'e', 'v', 'z', 'Escape', 'Delete', '[', ']']);
    await pulsarTodo(m.contenedor, 2);
    await dibujar(m.contenedor);
    await escribir(m.contenedor);
    await teclas(window, ['Escape']);
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/api/comunidades/c1/lienzo/trazos'), expect.anything());
    expect(stompService.suscribir).toHaveBeenCalledWith('/topic/lienzo/c1', expect.any(Function));
    expect(stompService.publicar).toHaveBeenCalledWith('/app/lienzo/c1/parcial', expect.anything());
    await m.desmontar();
  });

  it('sala de fiesta en ronda', async () => {
    const m = await montar(<PartyRoomPage />, '/fiesta/s1', '/fiesta/:id');
    await dibujar(m.contenedor);
    for (const tipo of ['TICK', 'BORRADOR_DISPONIBLE', 'BORRADOR_TOMADO', 'BORRADOR_LIBERADO', 'HERRAMIENTA_TOMADA', 'HERRAMIENTA_LIBERADA']) {
      await emitir('/topic/fiesta/s1', { tipo, msRestantes: 5000, trazo: null, propietarioBorrador: 'sam', herramienta: 'MARCADOR', propietarioHerramienta: 'sam' });
    }
    await emitir('/topic/fiesta/s1', { tipo: 'TRAZO', msRestantes: null, trazo: { ...trazoParty, secuencia: 9 }, propietarioBorrador: null });
    await emitir('/topic/fiesta/s1', { tipo: 'TRAZO_PARCIAL', msRestantes: null, trazo: { ...trazoParty, secuencia: 0 }, propietarioBorrador: null });
    await emitir('/topic/fiesta/s1', { tipo: 'TRAZO', msRestantes: null, trazo: { ...trazoParty, secuencia: 10, autorId: YO, borrador: true }, propietarioBorrador: null });
    await emitir('/topic/fiesta/s1/chat', { autorId: OTRO, autorNombre: 'sam', contenido: 'hola', creadoEn: '2026-11-16T10:00:00Z' });
    await pulsarTodo(m.contenedor, 2);
    await dibujar(m.contenedor);
    await escribir(m.contenedor);
    await emitir('/topic/fiesta/s1', { tipo: 'RONDA_TERMINADA', msRestantes: 0, trazo: null, propietarioBorrador: null });
    await emitir('/topic/fiesta/s1', { tipo: 'JUEGO_TERMINADO', msRestantes: 0, trazo: null, propietarioBorrador: null });
    await esperar();
    await pulsarTodo(m.contenedor, 1);
    expect(api.get).toHaveBeenCalledWith('/api/fiestas/s1/estado');
    expect(stompService.suscribir).toHaveBeenCalledWith('/topic/fiesta/s1', expect.any(Function));
    await m.desmontar();
  });

  it('lobby de fiesta y banner mural', async () => {
    const lobby = await montar(<PartyLobbyPage />, '/fiesta');
    expect(lobby.contenedor.textContent).toContain('ABC123');
    await escribir(lobby.contenedor, 'abc123');
    await pulsarTodo(lobby.contenedor, 2);
    expect(api.post).toHaveBeenCalledWith('/api/fiestas/limpiar');
    await lobby.desmontar();

    const banner = await montar(<CommunityBannerMural comunidadId="c1" interactivo mostrarBarraHerramientas onCerrarEdicion={() => {}} />);
    await dibujar(banner.contenedor);
    await emitir('/topic/banner/c1', { ...trazoParty, regionIndex: 0, secuencia: 5 });
    await pulsarTodo(banner.contenedor, 2);
    await dibujar(banner.contenedor);
    await banner.desmontar();

    expect(api.post).toHaveBeenCalledWith('/api/comunidades/c1/banner/pintar', expect.anything());
    const pagina = await montar(<BannerMuralPage />, '/comunidades/c1/banner', '/comunidades/:id/banner');
    expect(pagina.contenedor.querySelector('h1')?.textContent).toContain('Lienzo Mural');
    expect(api.get).toHaveBeenCalledWith('/api/comunidades/c1/banner');
    await pagina.desmontar();
  });

  it('tarjetas de publicacion propia y ajena', async () => {
    for (const pub of [publicacion, propia]) {
      for (const variante of ['tarjeta', 'detalle'] as const) {
        const m = await montar(<PostCard publicacion={pub} onEliminada={() => {}} onActualizada={() => {}} variante={variante} />);
        await emitir('/topic/publicaciones/', { tipo: 'LIKES_ACTUALIZADOS', publicacionId: pub.id, contadorLikes: 9 });
        await emitir('/comentarios', { tipo: 'COMENTARIO_CREADO', comentario: { id: 'k9', publicacionId: pub.id, autorId: OTRO, autorNombre: 'sam', contenido: 'x', creadoEn: '2026-11-16T10:00:00Z' }, contadorComentarios: 2 });
        await emitir('/comentarios', { tipo: 'COMENTARIO_ELIMINADO', comentario: { id: 'k9', publicacionId: pub.id }, contadorComentarios: 1 });
        await pulsarTodo(m.contenedor, 2, /cerrar sesi/i);
        await escribir(m.contenedor);
        await pulsarTodo(m.contenedor, 1, /cerrar sesi/i);
        await m.desmontar();
      }
    }
    expect(api.post).toHaveBeenCalledWith('/api/publicaciones/p1/like');
    const obra = await montar(<ObraPage />, '/obra/p1', '/obra/:id');
    expect(obra.contenedor.textContent).toContain('Obra');
    await obra.desmontar();
  });

  it('chat personal y de comunidad', async () => {
    const m = await montar(<PersonalChatPage />, `/mensajes?con=${OTRO}&nombre=sam`);
    expect(m.contenedor.textContent).toContain('sam');
    expect(api.get).toHaveBeenCalledWith('/api/mensajes/conversaciones');
    await pulsarTodo(m.contenedor, 1);
    await escribir(m.contenedor);
    await emitir('/user/queue/mensajes', { id: 'm9', remitenteId: OTRO, remitenteNombre: 'sam', destinatarioId: YO, contenido: 'nuevo', entregado: true, creadoEn: '2026-11-16T10:00:00Z' });
    await emitir('/queue/mensajes', { id: 'm10', remitenteId: 'u-nuevo', remitenteNombre: 'leo', destinatarioId: YO, contenido: 'otro', entregado: true, creadoEn: '2026-11-16T10:00:00Z' });
    await pulsarTodo(m.contenedor, 1);
    await m.desmontar();

    const panel = await montar(<ComunidadChatPanel comunidadId="c1" />);
    await escribir(panel.contenedor);
    await emitir('/topic/comunidad/c1/chat', { id: 'x', remitenteId: OTRO, remitenteNombre: 'sam', contenido: 'hola', creadoEn: '2026-11-16T10:00:00Z' });
    await pulsarTodo(panel.contenedor, 1);
    expect(panel.contenedor.textContent).toContain('hola');
    expect(stompService.publicar).toHaveBeenCalledWith('/app/comunidad/c1/chat/enviar', expect.anything());
    await panel.desmontar();
  });

  it('comunidades: lista, detalle, administracion y recomendadas', async () => {
    const lista = await montar(<CommunityListPage />, '/comunidades');
    expect(lista.contenedor.textContent).toContain('Acuarela');
    await pulsarTodo(lista.contenedor, 2);
    await escribir(lista.contenedor);
    await lista.desmontar();

    const detalle = await montar(<CommunityDetailPage />, '/comunidades/c1', '/comunidades/:id');
    expect(detalle.contenedor.textContent).toContain('Acuarela');
    await pulsarTodo(detalle.contenedor, 2);
    await detalle.desmontar();

    const admin = await montar(<CommunityAdminPanel comunidad={{ id: 'c1', nombre: 'A', descripcion: '', publica: true, creador: 'ana', totalMiembros: 2, miRol: 'ADMIN' }}
      esAdmin esCreador onMiembrosActualizados={() => {}} />);
    await pulsarTodo(admin.contenedor, 2);
    await escribir(admin.contenedor, 'leo');
    await pulsarTodo(admin.contenedor, 1);
    expect(api.get).toHaveBeenCalledWith('/api/comunidades/c1/miembros');
    await admin.desmontar();

    const onUnida = vi.fn();
    const recomendadas = await montar(<ComunidadesRecomendadas onUnida={onUnida} />);
    expect(recomendadas.contenedor.textContent).toContain('Tinta');
    await pulsarTodo(recomendadas.contenedor, 1);
    expect(api.post).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/comunidades\/c\d\/miembros$/));
    await recomendadas.desmontar();
  });

  it('perfil, publicacion y busqueda de artistas', async () => {
    const perfil = await montar(<ProfilePage />, '/perfil/ana', '/perfil/:nombreArtista');
    expect(perfil.contenedor.textContent).toContain('ana');
    await pulsarTodo(perfil.contenedor, 2);
    await escribir(perfil.contenedor);
    await pulsarTodo(perfil.contenedor, 1);
    await perfil.desmontar();

    const onCerrar = vi.fn();
    const wizard = await montar(<PublishWizard onCerrar={onCerrar} onPublicado={() => {}} />);
    expect(wizard.contenedor.textContent).toContain('Cancelar');
    await escribir(wizard.contenedor);
    await pulsarTodo(wizard.contenedor, 3);
    await escribir(wizard.contenedor);
    await pulsarTodo(wizard.contenedor, 2);
    expect(onCerrar).toHaveBeenCalled();
    await wizard.desmontar();

    const buscar = await montar(<BuscarArtistas mostrarSugerencias onSeguimientoCambiado={() => {}} />);
    await escribir(buscar.contenedor, 'sam');
    await esperarQue(() => vi.mocked(api.get).mock.calls.some(([url, opciones]) =>
      url === '/api/artistas' && (opciones as { params?: { q?: string } })?.params?.q === 'sam'));
    await esperarQue(() => (buscar.contenedor.textContent ?? '').includes('sam'));
    await pulsarTodo(buscar.contenedor, 1);
    expect(api.post).toHaveBeenCalledWith(`/api/artistas/${OTRO}/seguir`);
    await buscar.desmontar();

    const vivo = await montar(<DibujandoAhora />);
    await esperarQue(() => (vivo.contenedor.textContent ?? '').includes('sam'));
    expect(api.get).toHaveBeenCalledWith('/api/artistas/siguiendo/en-vivo');
    await pulsarTodo(vivo.contenedor, 1);
    await vivo.desmontar();
  });

  it('login, shell, admin y notificaciones', async () => {
    useAuthStore.setState({ sesion: null, sesionExpirada: true });
    const login = await montar(<GoogleOAuthProvider clientId="x"><LoginPage /></GoogleOAuthProvider>, '/login');
    expect(login.contenedor.textContent).toMatch(/sesi[oó]n/i);
    await escribir(login.contenedor, 'lucia');
    await pulsarTodo(login.contenedor, 1);
    await login.desmontar();
    const landing = await montar(<LandingPage />);
    expect(landing.contenedor.textContent).toContain('Modo fiesta');
    await landing.desmontar();
    const protegida = await montar(<ProtectedRoute><div>dentro</div></ProtectedRoute>);
    expect(protegida.contenedor.textContent).not.toContain('dentro');
    await protegida.desmontar();

    prepararEntorno('ADMIN');
    const shell = await montar(<AppShell><div>contenido</div></AppShell>, '/feed');
    expect(shell.contenedor.textContent).toContain('contenido');
    await pulsarTodo(shell.contenedor, 2, /cerrar sesi/i);
    await shell.desmontar();

    const admin = await montar(<AdminRoute><AdminDashboardPage /></AdminRoute>, '/admin');
    expect(admin.contenedor.textContent).toContain('Retencion');
    await pulsarTodo(admin.contenedor, 2);
    await admin.desmontar();

    const notis = await montar(<NotificationsPage />, '/notificaciones');
    expect(notis.contenedor.textContent).toContain('le gusto');
    await pulsarTodo(notis.contenedor, 2);
    await notis.desmontar();

    const resultados: [string, RegExp][] = [
      ['?status=approved&external_reference=sim_1', /./],
      ['?status=pending', /./],
      ['?status=rejected', /El pago no se complet/],
      ['', /./],
    ];
    for (const [q, texto] of resultados) {
      const r = await montar(<SuscripcionResultadoPage />, `/suscripcion/resultado${q}`);
      await esperar();
      expect(r.contenedor.querySelector('h1')?.textContent).toMatch(texto);
      await pulsarTodo(r.contenedor, 1);
      await r.desmontar();
    }

    const onReportada = vi.fn();
    const modal = await montar(<ModalReportar publicacionId="p1" onCerrar={() => {}} onReportada={onReportada} />);
    expect(document.body.textContent).toContain('Reportar obra');
    await escribir(modal.contenedor);
    await pulsarTodo(modal.contenedor, 2);
    expect(api.post).toHaveBeenCalledWith('/api/publicaciones/p1/reportar', expect.objectContaining({ motivo: expect.any(String) }));
    expect(onReportada).toHaveBeenCalled();
    await modal.desmontar();
  });
});
