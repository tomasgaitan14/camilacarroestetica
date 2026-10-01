import { describe, expect, it } from 'vitest'
import { canClientChange, parseReschedule, toBookingRef } from './client-changes.js'
import { ValidationError } from './errors.js'

// Lunes 5 de octubre, 12:00 en Buenos Aires
const NOW = new Date('2026-10-05T15:00:00Z')
const REF = toBookingRef('3c2b1a0f-9e8d-4c7b-a6f5-4e3d2c1b0a9f', 'tmmehom57v0qeu6eh4idovmh68')

function invalidFields(input: unknown): string[] {
  try {
    parseReschedule(input, NOW)
  } catch (error) {
    if (error instanceof ValidationError) return Object.keys(error.fields)
    throw error
  }
  throw new Error('parseReschedule no lanzó un ValidationError')
}

describe('canClientChange', () => {
  it('lets the client change a booking more than 24 hours ahead', () => {
    expect(canClientChange(new Date('2026-10-06T15:01:00Z'), NOW)).toBe(true)
  })

  it('does not let the client change it with exactly 24 hours left', () => {
    expect(canClientChange(new Date('2026-10-06T15:00:00Z'), NOW)).toBe(false)
  })
})

describe('parseReschedule', () => {
  it('returns the request with the phone normalized', () => {
    const request = parseReschedule({ client_phone: '11 2345-6789', ref: REF, date: '2026-10-08', time: '10:00' }, NOW)

    expect(request).toEqual({ client_phone: '5491123456789', ref: REF, date: '2026-10-08', time: '10:00' })
  })

  it.each(['abc', `${REF}/../otro`, 'x'.repeat(36) + ':tmmehom57v0q'])('rejects the booking reference %s', ref => {
    expect(invalidFields({ client_phone: '11 2345-6789', ref, date: '2026-10-08', time: '10:00' })).toEqual(['ref'])
  })

  it('rejects moving the booking to a date before today', () => {
    expect(invalidFields({ client_phone: '11 2345-6789', ref: REF, date: '2026-10-04', time: '10:00' })).toEqual(['date'])
  })
})
