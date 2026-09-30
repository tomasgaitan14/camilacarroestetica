import { describe, expect, it } from 'vitest'
import { createSessionToken, isValidSessionToken, passwordMatches, readSessionToken } from './session.js'

const SECRET = 'secreto-de-sesion-falso-para-tests-0123456789'
const NOW = new Date('2026-10-05T15:00:00Z')
const EIGHT_DAYS_LATER = new Date('2026-10-13T15:00:00Z')

describe('admin session', () => {
  it('accepts its own token until it expires a week later', () => {
    const token = createSessionToken(SECRET, NOW)

    expect(isValidSessionToken(token, SECRET, NOW)).toBe(true)
    expect(isValidSessionToken(token, SECRET, EIGHT_DAYS_LATER)).toBe(false)
  })

  it('rejects a token signed with another secret or with a stretched expiry', () => {
    const token = createSessionToken(SECRET, NOW)
    const [, signature] = token.split('.')

    expect(isValidSessionToken(token, 'otro-secreto-de-al-menos-32-caracteres', NOW)).toBe(false)
    expect(isValidSessionToken(`${EIGHT_DAYS_LATER.getTime() * 10}.${signature}`, SECRET, NOW)).toBe(false)
  })

  it('only matches the exact password', () => {
    expect(passwordMatches('turnos-camila-2026', 'turnos-camila-2026')).toBe(true)
    expect(passwordMatches('turnos-camila-202', 'turnos-camila-2026')).toBe(false)
  })

  it('reads the session cookie among others', () => {
    const request = new Request('https://example.com/api/session', {
      headers: { cookie: 'theme=dark; admin_session=123.abc; other=1' },
    })

    expect(readSessionToken(request)).toBe('123.abc')
  })
})
