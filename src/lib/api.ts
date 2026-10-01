import type { ApiErrorBody } from '@/types'

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

// Si la función se cae antes de responder, Vercel devuelve HTML y no JSON
async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return await response.json() as ApiErrorBody
  } catch (error) {
    if (error instanceof SyntaxError) return { error: 'No pudimos conectarnos. Probá de nuevo en un rato.' }
    throw error
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await readErrorBody(response)
    throw new ApiError(response.status, error.error, error.fields)
  }
  return await response.json() as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

// El primer mensaje por campo explica mejor el problema que el genérico
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return Object.values(error.fields)[0] ?? error.message
  if (error instanceof TypeError) return 'No pudimos conectarnos. Revisá tu conexión.'
  throw error
}
