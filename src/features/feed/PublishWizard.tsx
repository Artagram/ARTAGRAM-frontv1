import { useState } from 'react';
import { api, extraerMensajeError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import type { PublicacionDto, SugerenciaEtiquetasResultado } from '../../types';

function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(',')[1] ?? resultado);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(archivo);
  });
}

export function PublishWizard({
  archivoInicial,
  onPublicado,
  onCerrar,
}: {
  archivoInicial?: File | null;
  onPublicado: (p: PublicacionDto) => void;
  onCerrar: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [etiquetasTexto, setEtiquetasTexto] = useState('');
  const [obraFinal, setObraFinal] = useState<File | null>(archivoInicial ?? null);
  const [previewObra, setPreviewObra] = useState<string | null>(archivoInicial ? URL.createObjectURL(archivoInicial) : null);
  const [imagenesProceso, setImagenesProceso] = useState<File[]>([]);
  const [previewsProceso, setPreviewsProceso] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sugiriendoIa, setSugiriendoIa] = useState(false);

  function elegirObraFinal(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null;
    setObraFinal(archivo);
    setPreviewObra(archivo ? URL.createObjectURL(archivo) : null);
  }

  function elegirProceso(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []).slice(0, 10);
    setImagenesProceso(archivos);
    previewsProceso.forEach((url) => URL.revokeObjectURL(url));
    setPreviewsProceso(archivos.map((f) => URL.createObjectURL(f)));
  }

  async function sugerirConIa() {
    if (!obraFinal) {
      setError('Sube primero la imagen final para que la IA pueda analizarla');
      return;
    }
    setError(null);
    setSugiriendoIa(true);
    try {
      const imagenBase64 = await archivoABase64(obraFinal);
      const { data } = await api.post<SugerenciaEtiquetasResultado>('/api/ia/sugerencias', {
        imagenBase64,
        tituloBorrador: titulo,
        descripcionBorrador: descripcion,
      });
      if (data.tituloSugerido && !titulo.trim()) {
        setTitulo(data.tituloSugerido);
      }
      if (data.descripcionSugerida && !descripcion.trim()) {
        setDescripcion(data.descripcionSugerida);
      }
      if (data.etiquetas && data.etiquetas.length > 0) {
        setEtiquetasTexto(data.etiquetas.join(', '));
      }
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudieron generar sugerencias con IA'));
    } finally {
      setSugiriendoIa(false);
    }
  }

  async function publicar() {
    if (!titulo.trim() || !obraFinal) {
      setError('Necesitas al menos un título y la imagen final');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append('titulo', titulo.trim());
      if (descripcion.trim()) form.append('descripcion', descripcion.trim());
      etiquetasTexto
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => form.append('etiquetas', t));
      form.append('obraFinal', obraFinal);
      imagenesProceso.forEach((f) => form.append('imagenesProceso', f));

      const { data } = await api.post<PublicacionDto>('/api/publicaciones', form);
      onPublicado(data);
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <StepDot activo={paso === 1} numero={1} etiqueta="La obra" />
        <div className="h-px flex-1 bg-paper/10" />
        <StepDot activo={paso === 2} numero={2} etiqueta="El proceso" />
      </div>

      {paso === 1 && (
        <div className="grid gap-4">
          <div className="flex flex-col gap-4">
            <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Jardines al amanecer" required />
            <TextField
              label="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Acuarela sobre papel, 30x40cm…"
            />
            <TextField
              label="Etiquetas separadas por coma"
              value={etiquetasTexto}
              onChange={(e) => setEtiquetasTexto(e.target.value)}
              placeholder="acuarela, paisaje, jardines"
            />
          </div>
          <div>
            <p className="label mb-2">Imagen final</p>
            <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-paper/25 text-center text-xs text-paper-muted hover:border-coral/60">
              {previewObra ? (
                <img src={previewObra} alt="Vista previa" className="h-full w-full rounded-xl object-contain" />
              ) : (
                <>
                  <span className="text-2xl">🖼️</span>
                  Subir imagen
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={elegirObraFinal} />
            </label>
            {previewObra && (
              <button
                type="button"
                onClick={sugerirConIa}
                disabled={sugiriendoIa}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 py-2 text-xs font-medium text-teal transition-colors hover:bg-teal/20 disabled:opacity-50"
              >
                <span aria-hidden>✦</span>
                <span>{sugiriendoIa ? 'Analizando con IA…' : 'Sugerir con IA'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div>
          <p className="label mb-2 flex justify-between">
            <span>Fotos del proceso (opcional)</span>
            <span className="font-mono">{imagenesProceso.length}/10</span>
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-paper/25 px-4 py-8 text-center text-sm text-paper-muted hover:border-violet/60">
            <span className="text-2xl">📸</span>
            Arrastra o elige varias imágenes que muestren cómo la fuiste haciendo
            <input type="file" accept="image/*" multiple className="hidden" onChange={elegirProceso} />
          </label>
          {imagenesProceso.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previewsProceso.map((url, i) => (
                <img key={url} src={url} alt={`Paso ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="banner-error mt-4">{error}</p>}

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={onCerrar}>
          Cancelar
        </Button>
        <div className="flex gap-2">
          {paso === 2 && (
            <Button variant="secondary" onClick={() => setPaso(1)}>
              Atrás
            </Button>
          )}
          {paso === 1 ? (
            <Button onClick={() => (titulo.trim() && obraFinal ? setPaso(2) : setError('Necesitas al menos un título y la imagen final'))}>
              Siguiente
            </Button>
          ) : (
            <Button onClick={publicar} cargando={enviando}>
              Publicar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ activo, numero, etiqueta }: { activo: boolean; numero: number; etiqueta: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${activo ? 'text-coral' : 'text-paper-muted'}`}>
      <span
        className={`grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold ${
          activo ? 'border-coral bg-coral/15' : 'border-paper/25'
        }`}
      >
        {numero}
      </span>
      {etiqueta}
    </div>
  );
}
