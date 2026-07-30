import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-day-picker/dist/style.css'
import { useBookingStore } from '@/store/bookingStore'
import { useAvailability, useAppointments } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { generateTimeSlots, formatTime, DAY_LABELS } from '@/lib/utils'
import { Spinner } from '@/components/shared/Spinner'

interface Step3DateTimeProps {
  onNext: () => void
  onBack: () => void
}

export function Step3DateTime({ onNext, onBack }: Step3DateTimeProps) {
  const { selectedProfessionalId, selectedServiceId, selectedDate, selectedSlot, setDate, setSlot } = useBookingStore()
  const [localDate, setLocalDate] = useState<Date | undefined>(selectedDate ?? undefined)

  const { availability, blockedDates, loading: availLoading } = useAvailability(selectedProfessionalId)
  const { services } = useServices()
  const selectedService = services.find(s => s.id === selectedServiceId)

  const dateFrom = localDate ? format(localDate, 'yyyy-MM-dd') + 'T00:00:00' : undefined
  const dateTo = localDate ? format(localDate, 'yyyy-MM-dd') + 'T23:59:59' : undefined

  const { appointments, loading: apptLoading } = useAppointments({
    professionalId: selectedProfessionalId ?? undefined,
    dateFrom,
    dateTo,
  })

  const blockedDateStrings = blockedDates.map(b => b.date)
  const availableDaysOfWeek = [...new Set(availability.map(a => a.day_of_week))]

  function isDayDisabled(date: Date): boolean {
    if (isBefore(date, startOfDay(new Date()))) return true
    if (!availableDaysOfWeek.includes(date.getDay())) return true
    if (blockedDateStrings.includes(format(date, 'yyyy-MM-dd'))) return true
    return false
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    setLocalDate(date)
    setDate(date)
    setSlot(null as unknown as string)
  }

  function handleSlotSelect(time: string) {
    setSlot(time)
    onNext()
  }

  const slots = localDate && selectedService
    ? generateTimeSlots(localDate, availability, appointments, selectedService.duration_minutes)
    : []

  const availableSlots = slots.filter(s => s.available)

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

      {availLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {/* Calendario */}
          <div className="card mb-4 overflow-hidden p-0">
            <DayPicker
              mode="single"
              selected={localDate}
              onSelect={handleDateSelect}
              locale={es}
              disabled={isDayDisabled}
              className="!m-0 w-full"
              classNames={{
                root: 'w-full',
                months: 'w-full',
                month: 'w-full',
                table: 'w-full',
                head_cell: 'text-neutral-400 text-xs font-medium py-2',
                cell: 'text-center',
                button: 'w-9 h-9 rounded-full text-sm mx-auto flex items-center justify-center hover:bg-brand-50 transition-colors',
                day_selected: '!bg-brand-500 !text-white',
                day_disabled: '!text-neutral-200',
                day_today: 'font-bold border border-brand-300',
                nav_button: 'p-2 rounded-full hover:bg-neutral-100',
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
