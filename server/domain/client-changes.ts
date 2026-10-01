import { addHours } from 'date-fns'
import { z } from 'zod'
import { clientPhoneSchema, dateSchema, ensureNotPast, parseFields, timeSchema } from './booking-request.js'

// Cancelar o reprogramar se puede hasta 24 h antes; después, el cliente tiene que escribir
export const CLIENT_CHANGE_MIN_HOURS = 24

export function canClientChange(start: Date, now: Date): boolean {
  return start > addHours(now, CLIENT_CHANGE_MIN_HOURS)
}

// Referencia pública de un turno: id de la profesional + id del evento en su calendario.
// No da acceso por sí sola: cada pedido vuelve a buscar los turnos del celular y la busca ahí.
const REF_SEPARATOR = ':'
// Los ids de evento de Google Calendar usan base32hex: a-v y 0-9
const BOOKING_REF_PATTERN = /^[0-9a-f-]{36}:[a-v0-9]{5,1024}$/

export function toBookingRef(professionalId: string, eventId: string): string {
  return `${professionalId}${REF_SEPARATOR}${eventId}`
}

export interface ClientLookup {
  client_phone: string
}

export interface CancellationRequest extends ClientLookup {
  ref: string
}

export interface RescheduleRequest extends CancellationRequest {
  date: string  // 'yyyy-MM-dd'
  time: string  // 'HH:mm'
}

const lookupSchema = z.object({ client_phone: clientPhoneSchema })
const cancellationSchema = lookupSchema.extend({
  ref: z.string().regex(BOOKING_REF_PATTERN, { error: 'No encontramos ese turno' }),
})
const rescheduleSchema = cancellationSchema.extend({ date: dateSchema, time: timeSchema })

export function parseClientLookup(input: unknown): ClientLookup {
  return parseFields(lookupSchema, input)
}

export function parseCancellation(input: unknown): CancellationRequest {
  return parseFields(cancellationSchema, input)
}

export function parseReschedule(input: unknown, now: Date): RescheduleRequest {
  const request = parseFields(rescheduleSchema, input)
  ensureNotPast(request.date, request.time, now)
  return request
}
