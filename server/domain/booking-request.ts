import { z } from 'zod'
import { MAX_DAYS_AHEAD, MIN_NOTICE_HOURS } from '../../shared/booking-rules.js'
import { earliestBookableStart, lastBookableDate } from './booking-window.js'
import { ValidationError } from './errors.js'
import { normalizePhone } from './phone.js'
import { isValidDate, isValidTime, toInstant, toLocalDate } from './time.js'

// Pedido de reserva ya validado, con el teléfono normalizado
export interface BookingRequest {
  service_id: string
  date: string   // 'yyyy-MM-dd'
  time: string   // 'HH:mm'
  client_name: string
  client_phone: string
}

const INVALID_PHONE = 'Ingresá tu celular con código de área, sin 0 ni 15 (ej: 11 2345 6789)'
const REQUEST_FIELD = 'request'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 100
// Letras de cualquier idioma (acentos, ñ), espacios, puntos, apóstrofos y guiones
const NAME_PATTERN = /^[\p{L}\s.'-]+$/u

const clientName = z.string()
  .transform(name => name.trim().replace(/\s+/g, ' '))
  .pipe(z.string()
    .min(NAME_MIN_LENGTH, { error: `Ingresá tu nombre (al menos ${NAME_MIN_LENGTH} letras)` })
    .max(NAME_MAX_LENGTH, { error: `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres` })
    .regex(NAME_PATTERN, { error: 'El nombre solo puede tener letras, espacios, puntos, apóstrofos y guiones' }))

export const clientPhoneSchema = z.string().transform((raw, ctx) => {
  const phone = normalizePhone(raw)
  if (phone === null) {
    ctx.issues.push({ code: 'custom', message: INVALID_PHONE, input: raw })
    return z.NEVER
  }
  return phone
})

export const dateSchema = z.string().refine(isValidDate, { error: 'Elegí una fecha válida' })
export const timeSchema = z.string().refine(isValidTime, { error: 'Elegí un horario válido' })

const bookingRequestSchema = z.object({
  service_id: z.uuid({ error: 'Elegí un servicio' }),
  date: dateSchema,
  time: timeSchema,
  client_name: clientName,
  client_phone: clientPhoneSchema,
  // Campo trampa: va oculto en el formulario, así que solo un bot lo completa
  website: z.string().max(0, { error: 'No pudimos procesar la reserva' }).optional(),
})

// Valida el cuerpo del pedido y junta un mensaje por campo inválido
export function parseFields<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      // Sin path, el problema es el cuerpo entero (por ejemplo, no es un objeto)
      const field = issue.path.length > 0 ? String(issue.path[0]) : REQUEST_FIELD
      fields[field] ??= issue.message
    }
    throw new ValidationError(fields)
  }
  return parsed.data
}

// Desde hoy y hasta 30 días, con al menos 2 horas de anticipación
export function ensureBookable(date: string, time: string, now: Date): void {
  // Las fechas 'yyyy-MM-dd' se comparan bien como texto
  if (date < toLocalDate(now)) {
    throw new ValidationError({ date: 'Elegí una fecha a partir de hoy' })
  }
  if (date > lastBookableDate(now)) {
    throw new ValidationError({ date: `Se puede reservar hasta ${MAX_DAYS_AHEAD} días adelante` })
  }
  if (toInstant(date, time) < earliestBookableStart(now)) {
    throw new ValidationError({ time: `Reservá con al menos ${MIN_NOTICE_HOURS} horas de anticipación` })
  }
}

export function parseBookingRequest(input: unknown, now: Date): BookingRequest {
  const { website: _trap, ...request } = parseFields(bookingRequestSchema, input)
  ensureBookable(request.date, request.time, now)
  return request
}
