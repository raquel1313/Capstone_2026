import { ServiceError } from '@/lib/services/errors';

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ServiceError(400, 'INVALID_JSON', 'El cuerpo de la solicitud no es JSON válido.');
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ServiceError(400, 'INVALID_BODY', 'El cuerpo de la solicitud no es válido.');
  }

  return body as Record<string, unknown>;
}

export function optionalString(value: unknown, maxLength = 255): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ServiceError(400, 'INVALID_FIELD', 'Un campo de texto no es válido.');
  }

  return value.slice(0, maxLength);
}

export function positiveInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ServiceError(400, 'INVALID_FIELD', `El campo ${field} debe ser un entero positivo.`);
  }

  return value;
}
