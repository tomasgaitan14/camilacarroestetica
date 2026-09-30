import { describe, expect, it } from 'vitest'
import { toInstant, toLocalDate } from './time.js'

describe('toInstant', () => {
  it('reads a date and time as Buenos Aires local time, whatever the server time zone', () => {
    expect(toInstant('2026-10-05', '10:00').toISOString()).toBe('2026-10-05T13:00:00.000Z')
  })
})

describe('toLocalDate', () => {
  it('returns the Buenos Aires date, which lags behind UTC late at night', () => {
    expect(toLocalDate(new Date('2026-10-06T02:30:00Z'))).toBe('2026-10-05')
  })
})
