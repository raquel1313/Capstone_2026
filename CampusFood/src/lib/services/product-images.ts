import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ServiceError } from '@/lib/services/errors';

/*
 * Imágenes de productos en Supabase Storage (bucket público de solo lectura).
 * La base de datos guarda únicamente la ruta del objeto (imagen_path) y su URL
 * pública (imagen_url): nunca el contenido de la imagen.
 *
 * Seguridad:
 *  - solo administradores con MANAGE_PRODUCTS suben o borran (API del servidor);
 *  - el tipo se determina por los primeros bytes del archivo, no por la extensión
 *    ni por el Content-Type que declara el navegador;
 *  - el nombre del objeto lo genera el servidor (UUID): el nombre original se descarta;
 *  - tamaño máximo y formatos permitidos también se exigen en el bucket.
 */

export const PRODUCT_IMAGES_BUCKET = 'product-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
// Margen por los encabezados del formulario multipart.
export const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

type ImageType = { mime: string; extension: string };

const TYPES = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  png: { mime: 'image/png', extension: 'png' },
  webp: { mime: 'image/webp', extension: 'webp' },
  avif: { mime: 'image/avif', extension: 'avif' },
} as const satisfies Record<string, ImageType>;

export const ALLOWED_IMAGE_MIME_TYPES: string[] = Object.values(TYPES).map((type) => type.mime);

const MANAGED_PATH = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/;

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length));

/** Detecta el formato real por los primeros bytes (firma del archivo). */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return TYPES.jpeg;
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === 'PNG' &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return TYPES.png;
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return TYPES.webp;
  }

  // AVIF: caja "ftyp" con marca avif/avis en el encabezado.
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);

    if (brand === 'avif' || brand === 'avis') {
      return TYPES.avif;
    }
  }

  return null;
}

/** ¿Es una ruta generada por este módulo? Evita que el cliente apunte a otros objetos. */
export function isManagedImagePath(value: unknown): value is string {
  return typeof value === 'string' && MANAGED_PATH.test(value);
}

export function publicImageUrl(path: string): string {
  return supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

let bucketReady: Promise<void> | null = null;

/** Crea el bucket público con límites de tamaño y formato si todavía no existe. */
async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await supabaseAdmin.storage.getBucket(PRODUCT_IMAGES_BUCKET);

      if (data) {
        return;
      }

      const { error } = await supabaseAdmin.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
        public: true,
        fileSizeLimit: MAX_IMAGE_BYTES,
        allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
      });

      // Otra solicitud pudo crearlo al mismo tiempo.
      if (error && !/already exists|duplicate/i.test(error.message)) {
        throw error;
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }

  return bucketReady;
}

export type UploadedImage = { path: string; url: string };

/** Valida el archivo y lo sube con un nombre generado por el servidor. */
export async function uploadProductImage(file: File): Promise<UploadedImage> {
  if (file.size === 0) {
    throw new ServiceError(400, 'EMPTY_FILE', 'El archivo está vacío.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ServiceError(
      413,
      'FILE_TOO_LARGE',
      `La imagen pesa más de ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
    );
  }

  // Si el navegador declara un tipo, debe ser uno permitido (la validación real es la firma).
  if (file.type && !ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    throw new ServiceError(415, 'UNSUPPORTED_TYPE', 'Formato no permitido. Usa JPEG, PNG, WebP o AVIF.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);

  if (!type) {
    throw new ServiceError(
      415,
      'INVALID_IMAGE',
      'El archivo no es una imagen válida. Usa JPEG, PNG, WebP o AVIF.',
    );
  }

  if (file.type && file.type !== type.mime) {
    throw new ServiceError(415, 'TYPE_MISMATCH', 'El contenido del archivo no coincide con su formato.');
  }

  await ensureBucket();

  const path = `products/${randomUUID()}.${type.extension}`;

  const { error } = await supabaseAdmin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, bytes, {
      contentType: type.mime,
      // El nombre es único: la copia en caché del navegador nunca queda obsoleta.
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    console.error('Error subiendo imagen a Supabase Storage:', error);
    throw new ServiceError(502, 'STORAGE_ERROR', 'No fue posible guardar la imagen. Inténtalo nuevamente.');
  }

  return { path, url: publicImageUrl(path) };
}

export async function imageObjectExists(path: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).exists(path);

  return !error && data === true;
}

/** Borra el objeto; si falla solo se registra (la base de datos ya quedó consistente). */
export async function deleteProductImage(path: string | null | undefined): Promise<void> {
  if (!path || !isManagedImagePath(path)) {
    return;
  }

  const { error } = await supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);

  if (error) {
    console.error('No se pudo borrar la imagen de Storage:', path, error);
  }
}

export type ImageFields = { imagenUrl: string | null; imagenPath: string | null };

type ResolvedImage =
  | { ok: true; fields: ImageFields }
  | { ok: false; error: string; status: number };

/**
 * Valida una ruta de Storage enviada por el panel antes de asociarla a un producto:
 * debe haberla generado este módulo, existir en el bucket y no estar en uso por otro
 * producto. La URL pública siempre se calcula aquí; nunca se confía en la del cliente.
 */
export async function resolveManagedImage(
  path: unknown,
  exceptProductId?: number,
): Promise<ResolvedImage> {
  if (!isManagedImagePath(path)) {
    return { ok: false, status: 400, error: 'La ruta de la imagen no es válida.' };
  }

  if (!(await imageObjectExists(path))) {
    return { ok: false, status: 400, error: 'La imagen subida ya no existe. Vuelve a subirla.' };
  }

  const owner = await prisma.producto.findUnique({
    where: { imagenPath: path },
    select: { idProducto: true },
  });

  if (owner && owner.idProducto !== exceptProductId) {
    return { ok: false, status: 409, error: 'Esa imagen ya está asociada a otro producto.' };
  }

  return { ok: true, fields: { imagenUrl: publicImageUrl(path), imagenPath: path } };
}
