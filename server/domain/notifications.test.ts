import { describe, expect, it } from 'vitest'
import { confirmationText, isReminderDue, reminderText } from './notifications.js'

// Jueves 8 de octubre, 10:00 en Buenos Aires
const START = new Date('2026-10-08T13:00:00Z')
const NOTICE = { clientName: '  María José Pérez', serviceName: 'Limpieza facial', professionalName: 'Camila Carro', start: START }
const BOOKED = { client_phone: '5491123456789', client_name: 'María José Pérez', service_id: 's1' }

describe('message texts', () => {
  it('confirms the booking with the first name, the Buenos Aires day and time, and the cancel link', () => {
    expect(confirmationText(NOTICE, 'https://ejemplo.vercel.app/cancel')).toBe([
      'Hola María! Tu turno en Camila Carro Estética quedó confirmado:',
      '',
      'Servicio: Limpieza facial',
      'Día: jueves 8 de octubre a las 10:00',
      'Con: Camila Carro',
      '',
      'Podés cancelar o reprogramar hasta 24 horas antes: https://ejemplo.vercel.app/cancel',
    ].join('\n'))
  })

  it('reminds the booking with the Buenos Aires time and the salon WhatsApp link', () => {
    const text = reminderText(NOTICE, 'https://wa.me/5493446617979')

    expect(text).toContain('Te recordamos tu turno de hoy')
    expect(text).toContain('Hora: 10:00')
    expect(text).toContain('escribinos al WhatsApp del salón: https://wa.me/5493446617979')
  })
})

describe('isReminderDue', () => {
  const at = (iso: string) => new Date(iso)

  it('is due for a web booking that starts within the next 2 hours', () => {
    expect(isReminderDue({ start: START, privateProperties: BOOKED }, at('2026-10-08T11:00:00Z'))).toBe(true)
  })

  it('is not due yet when the booking starts in more than 2 hours', () => {
    expect(isReminderDue({ start: START, privateProperties: BOOKED }, at('2026-10-08T10:59:00Z'))).toBe(false)
  })

  it('is not sent twice', () => {
    const reminded = { ...BOOKED, reminder_sent_at: '2026-10-08T11:00:00Z' }

    expect(isReminderDue({ start: START, privateProperties: reminded }, at('2026-10-08T11:15:00Z'))).toBe(false)
  })

  it('skips events added by hand, which have no client phone', () => {
    expect(isReminderDue({ start: START, privateProperties: {} }, at('2026-10-08T12:00:00Z'))).toBe(false)
  })

  it('skips bookings that already started', () => {
    expect(isReminderDue({ start: START, privateProperties: BOOKED }, at('2026-10-08T13:05:00Z'))).toBe(false)
  })
})
