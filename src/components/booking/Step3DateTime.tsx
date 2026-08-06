import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, isBefore, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBookingStore } from '@/store/bookingStore'
import { useAvailability, useAppointments } from '@/hooks/useAppointments'
import { useProfessionalsForService } from '@/hooks/useServices'
import { useServices } from '@/hooks/useServices'
import { generateTimeSlots, formatTime, DAY_LABELS } from '@/lib/utils'
import { Spinner } from '@/components/shared/Spinner'

interface Step3DateTimeProps {
  onNext: () => void
  onBack: () => void
}

export function Step3DateTime({ onNext, onBack }: Step3DateTimeProps) {
  const { selectedServiceId, selectedDate, selectedSlot, setProfessionalSilent, setDate, setSlot } = useBookingStore()
  const [localDate, setLocalDate] = useState<Date | undefined>(selectedDate ?? undefined)

  const { professionals, loading: prosLoading } = useProfessionalsForService(selectedServiceId)
  const professionalIds = professionals.map(p => p.id)

  const { availability, blockedDates, loading: availLoading } = useAvailability(professionalIds)
  const { services } = useServices()
  const selectedService = services.find(s => s.id === selectedServiceId)

  const dateFrom = localDate ? startOfDay(localDate).toISOString() : undefined
  const dateTo = localDate ? endOfDay(localDate).toISOString() : undefined

  // Carga todos los turnos del día sin filtrar por profesional
  const { appointments, loading: apptLoading } = useAppointments({
    dateFrom,
    dateTo,
    statuses: ['confirmed'],
  })

  const availableDaysOfWeek = [...new Set(availability.map(a => a.day_of_week))]

  function isDayDisabled(date: Date): boolean {
    if (isBefore(date, startOfDay(new Date()))) return true
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()

    // Al menos un profesional debe tener ese día disponible y no bloqueado
    return !professionals.some(prof => {
      const hasAvail = availability.some(a => a.professional_id === prof.id && a.day_of_week === dayOfWeek)
      if (!hasAvail) return false
      return !blockedDates.some(b => b.professional_id === prof.id && b.date === dateStr)
    })
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    setLocalDate(date)
    setDate(date)
    setSlot(null as unknown as string)
  }

  // Genera slots por profesional y los fusiona: disponible si al menos uno está libre
  const mergedSlots = (() => {
    if (!localDate || !selectedService || professionals.length === 0) return []

    const slotsPerPro = professionals.map(prof => ({
      professionalId: prof.id,
      slots: generateTimeSlots(
        localDate,
        availability.filter(a => a.professional_id === prof.id),
        appointments.filter(a => a.professional_id === prof.id),
        selectedService.duration_minutes,
      ),
    }))

    const allTimes = [...new Set(slotsPerPro.flatMap(p => p.slots.map(s => s.time)))].sort()

    return allTimes.map(time => {
      let professionalId: string | null = null
      for (const { professionalId: pId, slots } of slotsPerPro) {
        if (slots.find(s => s.time === time)?.available) {
          professionalId = pId
          break
        }
      }
      return { time, available: professionalId !== null, professionalId }
    })
  })()

  const availableSlots = mergedSlots.filter(s => s.available)

  function handleSlotSelect(time: string) {
    const slot = mergedSlots.find(s => s.time === time)
    if (slot?.professionalId) setProfessionalSilent(slot.professionalId)
    setSlot(time)
    onNext()
  }

  const isLoading = prosLoading || availLoading

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-neutral-500 mb-4">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver
      </button>

      <h2 className="text-xl font-bold text-neutral-900 mb-1">Elegí fecha y horario</h2>
      <p className="text-sm text-neutral-500 mb-4">
        Días disponibles: {availableDaysOfWeek.map(d => DAY_LABELS[d]).join(', ')}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {/* Calendario */}
          <div className="card mb-4 overflow-hidden !p-0">
            <DayPicker
              mode="single"
              selected={localDate}
              onSelect={handleDateSelect}
              locale={es}
              disabled={isDayDisabled}
              showOutsideDays
              classNames={{
                months: 'w-full',
                month: 'w-full pb-4',
                caption: 'flex items-center justify-between px-4 pt-4 pb-1',
                caption_label: 'text-sm font-bold text-neutral-900 capitalize',
                nav: 'flex items-center gap-1',
                nav_button: 'w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600',
                nav_button_previous: '',
                nav_button_next: '',
                table: 'w-full border-collapse',
                head_row: '',
                head_cell: 'text-xs font-medium text-neutral-400 text-center py-2 w-[14.28%]',
                row: '',
                cell: 'text-center py-0.5 w-[14.28%]',
                day: [
                  'w-9 h-9 rounded-full text-sm font-medium mx-auto',
                  'flex items-center justify-center transition-colors',
                  'text-neutral-700 hover:bg-brand-50 hover:text-brand-600 cursor-pointer',
                ].join(' '),
                day_selected: '!bg-brand-500 !text-white hover:!bg-brand-600 shadow-sm',
                day_today: '!font-bold ring-1 ring-brand-400 !text-brand-600',
                day_disabled: '!text-neutral-200 hover:!bg-transparent cursor-default',
                day_outside: '!text-neutral-300 hover:!bg-transparent cursor-default',
              }}
            />
          </div>

          {/* Slots de tiempo */}
          {localDate && (
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-3">
                Horarios para el {format(localDate, "d 'de' MMMM", { locale: es })}
              </p>

              {apptLoading ? (
                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-sm">
                  No hay horarios disponibles para este día. Probá con otra fecha.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => handleSlotSelect(slot.time)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors
                        ${selectedSlot === slot.time
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white border-neutral-200 text-neutral-700 active:bg-brand-50'
                        }`}
                    >
                      {formatTime(slot.time)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
