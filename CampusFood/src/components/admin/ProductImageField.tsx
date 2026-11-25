import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';

export type ProductImageValue = {
  imageUrl: string;
  // Ruta del objeto en Supabase Storage (null si es una ruta local o una URL externa).
  imagePath: string | null;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 5 * 1024 * 1024;

type UploadResponse = { path?: string; url?: string; error?: string };

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// Borra una imagen subida que no llegó a guardarse en ningún producto o plato.
export async function discardUploadedImage(path: string | null) {
  if (!path) {
    return;
  }

  try {
    await fetch('/api/admin/products/images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  } catch (error) {
    console.error('No se pudo descartar la imagen subida:', error);
  }
}

/**
 * Selector de imagen: elige un archivo, valida, muestra la vista previa, lo sube a
 * Supabase Storage y entrega la ruta y URL para guardarlas en el producto o plato.
 * El servidor vuelve a validar tipo, tamaño y permisos.
 */
export function ProductImageField({
  value,
  savedPath,
  onChange,
  disabled = false,
  label = 'Imagen del producto',
}: {
  value: ProductImageValue;
  // Imagen ya guardada: no se borra hasta que se guarden los cambios.
  savedPath: string | null;
  onChange: (next: ProductImageValue) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Libera la URL temporal de la vista previa local.
  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const previewUrl = localPreview ?? value.imageUrl;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Permite volver a elegir el mismo archivo.
    event.target.value = '';

    if (!file) {
      return;
    }

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no permitido. Usa JPEG, PNG, WebP o AVIF.');

      return;
    }

    if (file.size > MAX_BYTES) {
      setError('La imagen pesa más de 5 MB.');

      return;
    }

    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);

    const previousPath = value.imagePath;

    try {
      const body = new FormData();

      body.append('file', file);

      const response = await fetch('/api/admin/products/images', {
        method: 'POST',
        body,
      });

      const data = await readJson<UploadResponse>(response);

      if (!response.ok || !data?.path || !data.url) {
        throw new Error(data?.error ?? 'No fue posible subir la imagen.');
      }

      onChange({ imageUrl: data.url, imagePath: data.path });

      // Al reemplazar, la imagen subida antes y sin guardar se descarta.
      if (previousPath && previousPath !== savedPath) {
        void discardUploadedImage(previousPath);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'No fue posible subir la imagen.'
      );
    } finally {
      setLocalPreview(null);
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setError(null);

    if (value.imagePath && value.imagePath !== savedPath) {
      void discardUploadedImage(value.imagePath);
    }

    onChange({ imageUrl: '', imagePath: null });
  };

  return (
    <div>
      <p className="text-xs text-ink/65">{label}</p>

      <div className="mt-1 flex items-center gap-3">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink/10 bg-brand-soft text-ink/65">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Vista previa de la imagen"
              fill
              sizes="80px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <ImagePlus size={22} aria-hidden="true" />
          )}

          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 size={20} className="animate-spin text-brand" aria-label="Subiendo imagen" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(event) => void handleFile(event)}
            disabled={disabled || uploading}
            className="sr-only"
            id={inputId}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previewUrl ? <RefreshCw size={13} /> : <ImagePlus size={13} />}
            {previewUrl ? 'Reemplazar' : 'Subir imagen'}
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-2 text-xs font-medium text-ink/65 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={13} />
              Quitar
            </button>
          )}
        </div>
      </div>

      <p className="mt-1.5 text-[11px] text-ink/65">JPEG, PNG, WebP o AVIF. Máximo 5 MB.</p>

      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}