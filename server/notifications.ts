import { addHours } from 'date-fns'
import { SALON_WHATSAPP, whatsappLink } from '../shared/salon.js'
import { listEventsBetween, setPrivateProperties } from './calendar.js'
import { loadCatalog } from './catalog.js'
import { EVENT_PROPERTY } from './domain/event-properties.js'
import { confirmationText, isReminderDue, REMINDER_HOURS_BEFORE, reminderText, type BookingNotice } from './domain/notifications.js'
import { getMessagingConfig, MessagingError, sendWhatsApp } from './messaging.js'

const UNKNOWN_SERVICE_NAME = 'Turno'

export interface ConfirmationNotice extends BookingNotice {
  clientPhone: string
  eventId: string
}

// La reserva ya está hecha: si WhatsApp falla, se registra y la clienta igual ve su turno confirmado
export async function notifyConfirmation(notice: ConfirmationNotice, appUrl: string): Promise<void> {
  try {
    await sendWhatsApp({
      to: notice.clientPhone,
      text: confirmationText(notice, `${appUrl}/cancel`),
      idempotencyKey: `confirmacion-${notice.eventId}`,
    })
  } catch (error) {
    if (!(error instanceof MessagingError)) throw error
    console.error(`No se pudo mandar la confirmación del evento ${notice.eventId} por WhatsApp: ${error.message}`)
  }
}

export interface ReminderRun {
  enabled: boolean
  sent: number
  failed: number
}

// Manda el recordatorio de los turnos que empiezan en menos de 2 h y marca el evento para no repetirlo
export async function sendDueReminders(now: Date): Promise<ReminderRun> {
  if (!getMessagingConfig()) return { enabled: false, sent: 0, failed: 0 }

  const catalog = await loadCatalog()
  const run: ReminderRun = { enabled: true, sent: 0, failed: 0 }
  for (const professional of catalog.professionals.filter(candidate => candidate.active)) {
    const events = await listEventsBetween(professional.calendar_id, now, addHours(now, REMINDER_HOURS_BEFORE))
    for (const event of events.filter(candidate => isReminderDue(candidate, now))) {
      const properties = event.privateProperties
      const service = catalog.services.find(candidate => candidate.id === properties[EVENT_PROPERTY.SERVICE_ID])
      const notice: BookingNotice = {
        clientName: properties[EVENT_PROPERTY.CLIENT_NAME] ?? '',
        serviceName: service?.name ?? UNKNOWN_SERVICE_NAME,
        professionalName: professional.name,
        start: event.start,
      }
      try {
        await sendWhatsApp({
          to: properties[EVENT_PROPERTY.CLIENT_PHONE],
          text: reminderText(notice, whatsappLink(SALON_WHATSAPP)),
          idempotencyKey: `recordatorio-${event.id}`,
        })
      } catch (error) {
        if (!(error instanceof MessagingError)) throw error
        console.error(`No se pudo mandar el recordatorio del evento ${event.id}: ${error.message}`)
        run.failed++
        continue
      }
      // Si marcar falla, la próxima pasada lo reintenta y Zernio descarta el duplicado por la Idempotency-Key
      await setPrivateProperties(professional.calendar_id, event.id, {
        ...properties,
        [EVENT_PROPERTY.REMINDER_SENT_AT]: now.toISOString(),
      })
      run.sent++
    }
  }
  return run
}
