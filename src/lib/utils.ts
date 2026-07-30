import { format, isBefore, addHours, parse, addMinutes, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Appointment, Availability, TimeSlot } from '@/types'

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DAY_LABELS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function formatDate(date: string | Date): string {
  return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es })
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function formatTime(time: string): string {
  // time puede ser "HH:MM:SS" o "HH:MM"
  return time.slice(0, 5)
}

export function formatDateTime(isoString: string): string {
  return format(new Date(isoString), "d 'de' MMMM 'a las' HH:mm", { locale: es })
}

export function formatWhatsappLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

export function formatInstagramLink(handle: string): string {
  const clean = handle.replace(/^@/, '')
  return `https://instagram.com/${clean}`
}

/**
 * Genera los slots de tiempo disponibles para un profesional en una fecha dada.
 * Cruza availability, blocked_dates y appointments existentes.
 */
export function generateTimeSlots(
  date: Date,
  availability: Availability[],
  bookedAppointments: Appointment[],
  durationMinutes: number,
): TimeSlot[] {
  const dayOfWeek = date.getDay()
  const dateStr = format(date, 'yyyy-MM-dd')

  const avail = availability.filter(a => a.day_of_week === dayOfWeek)
  if (avail.length === 0) return []

  const slots: TimeSlot[] = []

  for (const block of avail) {
    let current = parse(`${dateStr} ${formatTime(block.start_time)}`, 'yyyy-MM-dd HH:mm', new Date())
    const end = parse(`${dateStr} ${formatTime(block.end_time)}`, 'yyyy-MM-dd HH:mm', new Date())

    while (isBefore(addMinutes(current, durationMinutes), end) || addMinutes(current, durationMinutes).getTime() === end.getTime()) {
      const slotEnd = addMinutes(current, durationMinutes)
      const slotTime = format(current, 'HH:mm')

      // Verifica si el slot se superpone con algún turno existente
      const isBooked = bookedAppointments.some(appt => {
        const apptStart = new Date(appt.starts_at)
        const apptEnd = new Date(appt.ends_at)
        return (
          appt.status === 'confirmed' &&
          isBefore(current, apptEnd) &&
          isAfter(slotEnd, apptStart)
        )
      })

      // No mostrar slots en el pasado
      const isPast = isBefore(current, addHours(new Date(), 0))

      slots.push({ time: slotTime, available: !isBooked && !isPast })
      current = slotEnd
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * Limita la cancelación/reprogramación a más de 24hs antes del turno.
 */
export function canCancelOrReschedule(startsAt: string): boolean {
  const appointmentDate = new Date(startsAt)
  const deadline = addHours(new Date(), 24)
  return isAfter(appointmentDate, deadline)
}
