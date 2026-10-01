import { z } from 'zod'
import { HTTP_STATUS } from '../shared/http.js'
import type { SessionResponse } from '../shared/types.js'
import { getConfig } from '../server/config.js'
import { ValidationError } from '../server/domain/errors.js'
import { HttpError, json, readJson, withErrors } from '../server/http.js'
import { createSessionToken, expiredSessionCookie, isAdmin, passwordMatches, sessionCookie } from '../server/session.js'

const loginSchema = z.object({ password: z.string() })

export const GET = withErrors(async request => json({ authenticated: isAdmin(request) } satisfies SessionResponse))

// Login
export const POST = withErrors(async request => {
  const body = loginSchema.safeParse(await readJson(request))
  if (!body.success) throw new ValidationError({ password: 'Ingresá la contraseña' })

  const config = getConfig()
  if (!passwordMatches(body.data.password, config.adminPassword)) {
    throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'Contraseña incorrecta')
  }
  const cookie = sessionCookie(createSessionToken(config.sessionSecret, new Date()))
  return json({ authenticated: true } satisfies SessionResponse, HTTP_STATUS.OK, { 'Set-Cookie': cookie })
})

// Logout
export const DELETE = withErrors(async () =>
  json({ authenticated: false } satisfies SessionResponse, HTTP_STATUS.OK, { 'Set-Cookie': expiredSessionCookie() }))
