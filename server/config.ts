import { z } from 'zod'

// Configuración del backend, leída de las variables de entorno
export interface ServerConfig {
  serviceAccount: {
    email: string
    privateKey: string
  }
  sheetId: string
  oauthClientId: string
  adminEmails: string[]
  sessionSecret: string
}

interface ConfigProblem {
  variable: string
  detail: string
}

// Error de configuración: nombra cada variable que falta o es inválida
export class ConfigError extends Error {
  readonly variables: string[]

  constructor(problems: ConfigProblem[]) {
    super(`Variables de entorno inválidas: ${problems.map(p => `${p.variable} (${p.detail})`).join(', ')}`)
    this.name = 'ConfigError'
    this.variables = problems.map(p => p.variable)
  }
}

const MISSING = 'falta'
const INVALID_SERVICE_ACCOUNT_KEY = 'tiene que ser el JSON de la clave de la cuenta de servicio, codificado en base64'

// Con menos caracteres, la firma de la cookie de sesión se puede adivinar por fuerza bruta
const SESSION_SECRET_MIN_LENGTH = 32

// Sufijo de los IDs de cliente OAuth de Google (el secreto empieza con GOCSPX- y no lo tiene)
const OAUTH_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com'

// El ID de una hoja es lo que va entre /d/ y /edit en su URL
const SHEET_ID_PATTERN = /^[A-Za-z0-9_-]+$/

const PRIVATE_KEY_HEADER = '-----BEGIN PRIVATE KEY-----'

// abort: si falta, no tiene sentido seguir validando esa variable
const requiredString = z.string({ error: MISSING }).trim().min(1, { error: MISSING, abort: true })

// Devuelve undefined si el texto decodificado no es JSON
function decodeBase64Json(encoded: string): unknown {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) return undefined
    throw error
  }
}

// Solo los campos que usamos del JSON que descarga Google Cloud
const serviceAccountKeyFileSchema = z.object({
  client_email: z.email(),
  private_key: z.string().startsWith(PRIVATE_KEY_HEADER),
})

const serviceAccountKey = requiredString.transform((encoded, ctx) => {
  const keyFile = serviceAccountKeyFileSchema.safeParse(decodeBase64Json(encoded))
  if (!keyFile.success) {
    ctx.issues.push({ code: 'custom', message: INVALID_SERVICE_ACCOUNT_KEY, input: encoded })
    return z.NEVER
  }
  return { email: keyFile.data.client_email, privateKey: keyFile.data.private_key }
})

const emailSchema = z.email()

const adminEmails = requiredString.transform((list, ctx) => {
  const emails = list
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0)

  if (emails.length === 0) {
    ctx.issues.push({ code: 'custom', message: MISSING, input: list })
    return z.NEVER
  }

  const invalid = emails.filter(email => !emailSchema.safeParse(email).success)
  if (invalid.length > 0) {
    ctx.issues.push({ code: 'custom', message: `emails inválidos: ${invalid.join(', ')}`, input: list })
    return z.NEVER
  }
  return emails
})

const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_KEY: serviceAccountKey,
  GOOGLE_SHEET_ID: requiredString.regex(SHEET_ID_PATTERN, {
    error: 'tiene que ser solo el ID de la hoja, no la URL completa',
  }),
  GOOGLE_OAUTH_CLIENT_ID: requiredString.endsWith(OAUTH_CLIENT_ID_SUFFIX, {
    error: `tiene que ser el ID del cliente OAuth (termina en ${OAUTH_CLIENT_ID_SUFFIX})`,
  }),
  ADMIN_EMAILS: adminEmails,
  SESSION_SECRET: requiredString.min(SESSION_SECRET_MIN_LENGTH, {
    error: `tiene que tener al menos ${SESSION_SECRET_MIN_LENGTH} caracteres`,
  }),
})

export type Env = Record<string, string | undefined>

export function loadConfig(env: Env): ServerConfig {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map(issue => ({
      variable: String(issue.path[0]),
      detail: issue.message,
    })))
  }

  const vars = parsed.data

  return {
    serviceAccount: vars.GOOGLE_SERVICE_ACCOUNT_KEY,
    sheetId: vars.GOOGLE_SHEET_ID,
    oauthClientId: vars.GOOGLE_OAUTH_CLIENT_ID,
    adminEmails: vars.ADMIN_EMAILS,
    sessionSecret: vars.SESSION_SECRET,
  }
}
