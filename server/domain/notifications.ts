import { addHours } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { CLIENT_CHANGE_MIN_HOURS } from '../../shared/booking-rules.js'
import { EVENT_PROPERTY } from './event-properties.js'
import { APP_TIME_ZONE } from './time.js'

// El recordatorio sale cuando faltan 2 h o menos para el turno
export const REMINDER_HOURS_BEFORE = 2

export interface BookingNotice {
  clientName: string
  serviceName: string
  professionalName: string
  start: Date
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
}

// Mismo texto que la plantilla confirmacion_turno; el botón de la plantilla va acá como link
export function confirmationText(notice: BookingNotice, cancelUrl: string): string {
  const day = formatInTimeZone(notice.start, APP_TIME_ZONE, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  return [
    `Hola ${firstName(notice.clientName)}! Tu turno en Camila Carro Estética quedó confirmado:`,
    '',
    `Servicio: ${notice.serviceName}`,
    `Día: ${day}`,
    `Con: ${notice.professionalName}`,
    '',
    `Podés cancelar o reprogramar hasta ${CLIENT_CHANGE_MIN_HOURS} horas antes: ${cancelUrl}`,
  ].join('\n')
}

// Mismo texto que la plantilla recordatorio_turno
export function reminderText(notice: BookingNotice, salonWhatsappUrl: string): string {
  return [
    `Hola ${firstName(notice.clientName)}! Te recordamos tu turno de hoy en Camila Carro Estética:`,
    '',
    `Servicio: ${notice.serviceName}`,
    `Hora: ${formatInTimeZone(notice.start, APP_TIME_ZONE, 'HH:mm')}`,
    `Con: ${notice.professionalName}`,
    '',
    `Si no vas a poder venir, escribinos al WhatsApp del salón: ${salonWhatsappUrl}`,
  ].join('\n')
}

export interface ReminderCandidate {
  start: Date
  privateProperties: Record<string, string>
}

// Solo los turnos reservados desde la web tienen celular; los eventos cargados a mano no reciben nada
export function isReminderDue(event: ReminderCandidate, now: Date): boolean {
  return Boolean(event.privateProperties[EVENT_PROPERTY.CLIENT_PHONE])
    && !event.privateProperties[EVENT_PROPERTY.REMINDER_SENT_AT]
    && event.start > now
    && event.start <= addHours(now, REMINDER_HOURS_BEFORE)
}
