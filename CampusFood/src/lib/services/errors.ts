/** Error de negocio con código HTTP, para responder desde las API. */
export class ServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
  }
}

export function toErrorResponse(error: unknown, context: string): Response {
  if (error instanceof ServiceError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error(`${context}:`, error);

  return Response.json(
    { error: 'Ocurrió un error inesperado. Inténtalo nuevamente.' },
    { status: 500 },
  );
}
