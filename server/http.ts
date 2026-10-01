import { HTTP_STATUS } from '../shared/http.js'
import type { ApiErrorBody } from '../shared/types.js'
import { ValidationError } from './domain/errors.js'

// Error con un status HTTP y un mensaje para mostrar
export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function json(body: unknown, status: number = HTTP_STATUS.OK, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch (error) {
    if (error instanceof SyntaxError) throw new ValidationError({ request: 'El cuerpo del pedido tiene que ser JSON' })
    throw error
  }
}

type Handler = (request: Request) => Promise<Response>

// Borde de cada función: los errores conocidos salen con su status; el resto se loguea y sale como 500
export function withErrors(handler: Handler): Handler {
  return async request => {
    try {
      return await handler(request)
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({ error: error.message, fields: error.fields } satisfies ApiErrorBody, HTTP_STATUS.BAD_REQUEST)
      }
      if (error instanceof HttpError) {
        return json({ error: error.message } satisfies ApiErrorBody, error.status)
      }
      console.error(error)
      return json({ error: 'Error interno, probá de nuevo en un rato' } satisfies ApiErrorBody, HTTP_STATUS.INTERNAL_ERROR)
    }
  }
}
