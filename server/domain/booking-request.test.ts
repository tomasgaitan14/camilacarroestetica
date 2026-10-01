import { describe, expect, it } from 'vitest'
import { parseBookingRequest } from './booking-request.js'
import { ValidationError } from './errors.js'

// Lunes 5 de octubre, 12:00 en Buenos Aires
const NOW = new Date('2026-10-05T15:00:00Z')

const SERVICE_ID = '3c2b1a0f-9e8d-4c7b-a6f5-4e3d2c1b0a9f'

// Lo que manda el formulario de /booking; website es el campo trampa para bots
// Devuelve los campos que parseBookingRequest marcó como inválidos
function invalidFields(input: unknown, now = NOW): string[] {
  try {
    parseBookingRequest(input, now)
  } catch (error) {
    if (error instanceof ValidationError) return Object.keys(error.fields)
    throw error
  }
  throw new Error('parseBookingRequest no lanzó un ValidationError')
}

function validInput(): Record<string, unknown> {
  return {
    service_id: SERVICE_ID,
    date: '2026-10-07',
    time: '10:00',
    client_name: 'María Pérez',
    client_phone: '11 2345-6789',
    website: '',
  }
}

describe('parseBookingRequest', () => {
  it('returns the booking with the name tidied and the phone normalized', () => {
    const request = parseBookingRequest({ ...validInput(), client_name: '  María   Pérez ' }, NOW)

    expect(request).toEqual({
      service_id: SERVICE_ID,
      date: '2026-10-07',
      time: '10:00',
      client_name: 'María Pérez',
      client_phone: '5491123456789',
    })
  })

  it('rejects a phone that cannot be normalized, instead of saving it as typed', () => {
    expect(invalidFields({ ...validInput(), client_phone: '2345-6789' })).toEqual(['client_phone'])
  })

  it.each([
    ['   ', 'en blanco'],
    ['A', 'de una sola letra'],
    ['A'.repeat(101), 'de más de 100 caracteres'],
    ['<script>alert(1)</script>', 'con símbolos'],
    ['Juan123', 'con números'],
  ])('rejects the name %s (%s)', name => {
    expect(invalidFields({ ...validInput(), client_name: name })).toEqual(['client_name'])
  })

  it.each([
    ['07/10/2026', 'con otro formato'],
    // Futura a propósito: una fecha pasada la rechaza igual la regla de "a partir de hoy"
    ['2027-02-30', 'que no existe'],
    ['', 'vacía'],
  ])('rejects the date %s (%s)', date => {
    expect(invalidFields({ ...validInput(), date })).toEqual(['date'])
  })

  it.each(['25:00', '10:60', '9:00', ''])('rejects the time %s', time => {
    expect(invalidFields({ ...validInput(), time })).toEqual(['time'])
  })

  it('reports every invalid field at once, so the form can show them together', () => {
    expect(invalidFields({ ...validInput(), client_name: 'A', client_phone: '123' })).toEqual(['client_name', 'client_phone'])
  })

  // Filas explícitas: it.each desarma los arrays y [] llegaría como undefined
  it.each([[null], ['reserva'], [[]], [undefined]])('rejects a body that is not an object (%j) under the request key', body => {
    expect(invalidFields(body)).toEqual(['request'])
  })

  it('rejects the booking when the hidden trap field comes filled in, as bots do', () => {
    expect(invalidFields({ ...validInput(), website: 'https://spam.example' })).toEqual(['website'])
  })

  it('accepts the booking when the trap field is missing altogether', () => {
    const { website: _website, ...withoutTrap } = validInput()

    expect(parseBookingRequest(withoutTrap, NOW).client_phone).toBe('5491123456789')
  })

  it.each(['limpieza-facial', ''])('rejects the service id %s', serviceId => {
    expect(invalidFields({ ...validInput(), service_id: serviceId })).toEqual(['service_id'])
  })

  it('rejects a date before today', () => {
    expect(invalidFields({ ...validInput(), date: '2026-10-04' })).toEqual(['date'])
  })

  it('rejects a time that already passed today', () => {
    expect(invalidFields({ ...validInput(), date: '2026-10-05', time: '11:00' })).toEqual(['time'])
  })

  it('accepts a time today exactly 2 hours from now', () => {
    const request = parseBookingRequest({ ...validInput(), date: '2026-10-05', time: '14:00' }, NOW)

    expect(request.time).toBe('14:00')
  })

  it('rejects a time today within the next 2 hours', () => {
    expect(invalidFields({ ...validInput(), date: '2026-10-05', time: '13:30' })).toEqual(['time'])
  })

  it('still takes today as the Buenos Aires date late at night, when UTC is already tomorrow', () => {
    const lateMondayNight = new Date('2026-10-06T02:30:00Z')  // lunes 23:30 en Buenos Aires

    // Falla por la anticipación, no por la fecha: el lunes sigue siendo hoy
    expect(invalidFields({ ...validInput(), date: '2026-10-05', time: '23:45' }, lateMondayNight)).toEqual(['time'])
  })

  it('accepts dates up to 30 days ahead and rejects the next one', () => {
    expect(parseBookingRequest({ ...validInput(), date: '2026-11-04' }, NOW).date).toBe('2026-11-04')
    expect(invalidFields({ ...validInput(), date: '2026-11-05' })).toEqual(['date'])
  })

  it("accepts names with accents, ñ, apostrophes and hyphens, like María José O'Neill-Núñez", () => {
    const request = parseBookingRequest({ ...validInput(), client_name: "María José O'Neill-Núñez" }, NOW)

    expect(request.client_name).toBe("María José O'Neill-Núñez")
  })
})
