import { addHours } from 'date-fns'
import { MAX_DAYS_AHEAD, MAX_FUTURE_BOOKINGS_PER_PHONE, MIN_NOTICE_HOURS } from '../../shared/booking-rules.js'
import { addDaysToDate, toLocalDate } from './time.js'

// No se ofrecen ni se aceptan turnos que empiecen antes de esto
export function earliestBookableStart(now: Date): Date {
  return addHours(now, MIN_NOTICE_HOURS)
}

// Último día que se puede reservar, contado desde la fecha de hoy en el salón
export function lastBookableDate(now: Date): string {
  return addDaysToDate(toLocalDate(now), MAX_DAYS_AHEAD)
}

export function canBookAnother(futureBookings: number): boolean {
  return futureBookings < MAX_FUTURE_BOOKINGS_PER_PHONE
}
