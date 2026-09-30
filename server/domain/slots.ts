import { addMinutes } from 'date-fns'
import { intervalsOverlap, toInstant, weekdayOf, type TimeInterval } from './time.js'

// Bloque semanal de trabajo de una profesional, en horas 'HH:mm' locales
export interface AvailabilityBlock {
  day_of_week: number  // 0=domingo, 6=sábado
  start_time: string
  end_time: string
}

// Intervalo ocupado en el calendario de la profesional
export type BusyInterval = TimeInterval

export interface ProfessionalSchedule {
  professional_id: string
  availability: AvailabilityBlock[]
  busy: BusyInterval[]
}

export interface AvailableSlot {
  time: string  // 'HH:mm'
  professional_id: string
}

export interface SlotQuery {
  date: string  // 'yyyy-MM-dd'
  durationMinutes: number
  professionals: ProfessionalSchedule[]
  now: Date
}

const MINUTES_PER_HOUR = 60

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * MINUTES_PER_HOUR + minutes
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function computeAvailableSlots({ date, durationMinutes, professionals, now }: SlotQuery): AvailableSlot[] {
  // Con 0 o negativa el loop no termina nunca; con decimales las horas quedan rotas
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError(`La duración del servicio tiene que ser un entero positivo de minutos (llegó ${durationMinutes})`)
  }

  const weekday = weekdayOf(date)
  // hora -> profesional asignada; gana la primera libre en el orden recibido
  const assigned = new Map<string, string>()

  for (const professional of professionals) {
    const blocks = professional.availability.filter(block => block.day_of_week === weekday)
    for (const block of blocks) {
      const blockEnd = toMinutes(block.end_time)
      for (let minute = toMinutes(block.start_time); minute + durationMinutes <= blockEnd; minute += durationMinutes) {
        const time = toTime(minute)
        if (assigned.has(time)) continue

        const slotStart = toInstant(date, time)
        const slot = { start: slotStart, end: addMinutes(slotStart, durationMinutes) }
        if (slot.start < now) continue
        if (professional.busy.some(busy => intervalsOverlap(slot, busy))) continue

        assigned.set(time, professional.professional_id)
      }
    }
  }

  return [...assigned.entries()]
    .map(([time, professionalId]) => ({ time, professional_id: professionalId }))
    .sort((a, b) => a.time.localeCompare(b.time))
}
