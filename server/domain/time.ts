import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

// El salón trabaja en hora de Argentina; Vercel corre en UTC
export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires'

// Convierte una fecha 'yyyy-MM-dd' y una hora 'HH:mm' locales del salón en un instante
export function toInstant(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, APP_TIME_ZONE)
}

// Fecha 'yyyy-MM-dd' que corresponde a un instante en el salón
export function toLocalDate(instant: Date): string {
  return formatInTimeZone(instant, APP_TIME_ZONE, 'yyyy-MM-dd')
}

// Hora 'HH:mm' que corresponde a un instante en el salón
export function toLocalTime(instant: Date): string {
  return formatInTimeZone(instant, APP_TIME_ZONE, 'HH:mm')
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const ISO_DATE_LENGTH = 'yyyy-MM-dd'.length

// Medianoche UTC de una fecha 'yyyy-MM-dd': sirve para trabajar con el día sin mirar zonas horarias
function toUtcMidnight(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

// Día de la semana de una fecha 'yyyy-MM-dd' (0=domingo), sin depender de la zona del servidor
export function weekdayOf(date: string): number {
  return toUtcMidnight(date).getUTCDay()
}

// 'yyyy-MM-dd' de un día que existe: Date corre el 30 de febrero al 2 de marzo y la fecha no vuelve igual
export function isValidDate(date: string): boolean {
  return DATE_PATTERN.test(date) && toUtcMidnight(date).toISOString().slice(0, ISO_DATE_LENGTH) === date
}

// 'HH:mm' de 24 horas
export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time)
}

// Si alguien escribe la hora a mano, Google Sheets la devuelve como '9:00' o '09:00:00'
const LOOSE_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

export function normalizeTime(time: string): string {
  const match = LOOSE_TIME_PATTERN.exec(time.trim())
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : time
}

// Intervalo de tiempo semiabierto [start, end)
export interface TimeInterval {
  start: Date
  end: Date
}

// El día completo de una fecha 'yyyy-MM-dd' en el salón, de medianoche a medianoche
export function dayInterval(date: string): TimeInterval {
  const nextDay = toUtcMidnight(date)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  return {
    start: toInstant(date, '00:00'),
    end: toInstant(nextDay.toISOString().slice(0, ISO_DATE_LENGTH), '00:00'),
  }
}

// Un intervalo que termina a las 10:00 no pisa otro que empieza a las 10:00
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && a.end > b.start
}
