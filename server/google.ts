import { JWT } from 'google-auth-library'
import { getConfig } from './config.js'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
]

export class GoogleApiError extends Error {
  readonly status: number

  constructor(status: number, detail: string) {
    super(`Google API respondió ${status}: ${detail}`)
    this.name = 'GoogleApiError'
    this.status = status
  }
}

// Se reusa entre invocaciones de la misma instancia, así el token no se pide cada vez
let authClient: JWT | undefined

function getAuthClient(): JWT {
  const { email, privateKey } = getConfig().serviceAccount
  authClient ??= new JWT({ email, key: privateKey, scopes: SCOPES })
  return authClient
}

interface GoogleRequest {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
}

export async function googleFetch<T>(url: string, { method = 'GET', body }: GoogleRequest = {}): Promise<T> {
  const { token } = await getAuthClient().getAccessToken()
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new GoogleApiError(response.status, await response.text())
  // DELETE responde 204 sin cuerpo
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}
