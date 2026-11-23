import { requirePermission } from '@/lib/auth/require-permission';
import { prisma } from '@/lib/prisma';
import { ServiceError, toErrorResponse } from '@/lib/services/errors';
import { readJsonBody } from '@/lib/services/http';
import {
  deleteProductImage,
  isManagedImagePath,
  MAX_REQUEST_BYTES,
  uploadProductImage,
} from '@/lib/services/product-images';

export const runtime = 'nodejs';

/** Sube una imagen (multipart, campo "file") y devuelve su ruta y URL pública. */
export async function POST(request: Request) {
  const auth = await requirePermission('MANAGE_PRODUCTS');

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const declaredLength = Number(request.headers.get('content-length') ?? '0');

    if (declaredLength > MAX_REQUEST_BYTES) {
      throw new ServiceError(413, 'FILE_TOO_LARGE', 'La imagen es demasiado pesada (máximo 5 MB).');
    }

    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      throw new ServiceError(400, 'INVALID_FORM', 'La solicitud no es un formulario de archivo válido.');
    }

    const file = form.get('file');

    if (!(file instanceof File)) {
      throw new ServiceError(400, 'MISSING_FILE', 'Falta el archivo de imagen.');
    }

    return Response.json(await uploadProductImage(file), { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'POST /api/admin/products/images');
  }
}

/**
 * { path } — elimina una imagen subida que no quedó asociada a ningún producto
 * (por ejemplo, si se cancela el formulario). Una imagen en uso no se borra aquí.
 */
export async function DELETE(request: Request) {
  const auth = await requirePermission('MANAGE_PRODUCTS');

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await readJsonBody(request);

    if (!isManagedImagePath(body.path)) {
      throw new ServiceError(400, 'INVALID_PATH', 'La ruta de la imagen no es válida.');
    }

    const inUse = await prisma.producto.findUnique({
      where: { imagenPath: body.path },
      select: { idProducto: true },
    });

    if (inUse) {
      throw new ServiceError(409, 'IMAGE_IN_USE', 'La imagen está asociada a un producto.');
    }

    await deleteProductImage(body.path);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, 'DELETE /api/admin/products/images');
  }
}
