import { describe, expect, it } from 'vitest'
import { normalizePhone } from './phone.js'

describe('normalizePhone', () => {
  it('turns a local number with area code into the international mobile format WhatsApp needs', () => {
    expect(normalizePhone('11 2345-6789')).toBe('5491123456789')
  })

  it.each([
    '+54 9 11 2345-6789',
    '+54 11 2345 6789',
    '011 2345-6789',
    '5491123456789',
    '541123456789',
    '0054 9 11 2345 6789',
  ])('gives the same result for the same number written as %s', raw => {
    expect(normalizePhone(raw)).toBe('5491123456789')
  })

  it.each([
    ['2345-6789', 'sin código de área'],
    ['15 2345 6789', 'con el 15 y sin código de área'],
    ['11 15 2345 6789', 'con el 15 después del código de área'],
    ['', 'vacío'],
    ['sin teléfono', 'sin dígitos'],
  ])('rejects %s (%s)', raw => {
    expect(normalizePhone(raw)).toBeNull()
  })

  it.each(['+34 612 345 678', '0034 612 345 678'])('keeps a foreign number written with its country code, like %s', raw => {
    expect(normalizePhone(raw)).toBe('34612345678')
  })

  it.each([
    ['+598 1234', 'demasiado corto'],
    ['+34 6123 4567 8901 2345', 'más largo de lo que permite E.164'],
  ])('rejects the foreign number %s (%s)', raw => {
    expect(normalizePhone(raw)).toBeNull()
  })
})
