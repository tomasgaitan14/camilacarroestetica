import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { HTTP_STATUS } from '../shared/http.js'
import { getConfig } from './config.js'
import { HttpError } from './http.js'

const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60
const MS_PER_SECOND = 1000

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

// Tiempo constante; los hashes igualan el largo, que timingSafeEqual exige
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}

export function passwordMatches(input: string, expected: string): boolean {
  return safeEqual(input, expected)
}

// Token '<vencimiento en ms>.<firma>': cambiar SESSION_SECRET cierra todas las sesiones
export function createSessionToken(secret: string, now: Date): string {
  const expiresAt = String(now.getTime() + SESSION_TTL_SECONDS * MS_PER_SECOND)
  return `${expiresAt}.${sign(expiresAt, secret)}`
}

export function isValidSessionToken(token: string, secret: string, now: Date): boolean {
  const [expiresAt, signature, ...rest] = token.split('.')
  if (!expiresAt || !signature || rest.length > 0) return false
  if (!safeEqual(signature, sign(expiresAt, secret))) return false
  return Number(expiresAt) > now.getTime()
}

export function readSessionToken(request: Request): string | null {
  const cookies = request.headers.get('cookie') ?? ''
  for (const cookie of cookies.split(';')) {
    const [name, ...value] = cookie.trim().split('=')
    if (name === SESSION_COOKIE) return value.join('=')
  }
  return null
}

const COOKIE_ATTRIBUTES = 'Path=/api; HttpOnly; Secure; SameSite=Strict'

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; ${COOKIE_ATTRIBUTES}; Max-Age=${SESSION_TTL_SECONDS}`
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${COOKIE_ATTRIBUTES}; Max-Age=0`
}

export function isAdmin(request: Request): boolean {
  const token = readSessionToken(request)
  return token !== null && isValidSessionToken(token, getConfig().sessionSecret, new Date())
}

export function requireAdmin(request: Request): void {
  if (!isAdmin(request)) throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'Tu sesión venció, volvé a entrar')
}
