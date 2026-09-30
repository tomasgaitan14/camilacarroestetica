import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBookingStore } from '@/store/bookingStore'
import { api, errorMessage } from '@/lib/api'
import { DAY_LABELS } from '@/lib/utils'
import { Spinner } from '@/components/shared/Spinner'
import type { SlotsResponse } from '@/types'

interface Step3DateTimeProps {
  onNext: () => void
  onBack: () => void
}

export function Step3DateTime({ onNext, onBack }: Step3DateTimeProps) {
  const { selectedService, selectedDate, selectedSlot, setDate, setSlot } = useBookingStore()
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const date = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null

  // Cada vez que se muestra un día se consultan los calendarios, así no aparece lo que se cargó a mano
  useEffect(() => {
    if (!selectedService || !date) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ service_id: selectedService.id, date })
    api.get<SlotsResponse>(`slots?${params}`)
      .then(response => { if (!cancelled) setSlots(response.slots) })
      .catch(err => {
        if (cancelled) return
        setSlots([])
        setError(errorMessage(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedService, date])

  if (!selectedService) return null

  function isDayDisabled(day: Date): boolean {
    return isBefore(day, startOfDay(new Date())) || !selectedService?.weekdays.includes(day.getDay())
  }

  function handleDateSelect(day: Date | undefined) {
    if (day) setDate(day)
  }

  function handleSlotSelect(time: string) {
    setSlot(time)
    onNext()
  }

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
        Días disponibles: {selectedService.weekdays.map(day => DAY_LABELS[day]).join(', ')}
      </p>

      <div className="card mb-4 overflow-hidden !p-0">
        <DayPicker
          mode="single"
          selected={selectedDate ?? undefined}
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

      {selectedDate && (
        <div>
          <p className="text-sm font-semibold text-neutral-700 mb-3">
            Horarios para el {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </p>

          {loading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-6 text-neutral-500 text-sm">
              No hay horarios disponibles para este día. Probá con otra fecha.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((time) => (
                <button
                  key={time}
                  onClick={() => handleSlotSelect(time)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors
                    ${selectedSlot === time
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white border-neutral-200 text-neutral-700 active:bg-brand-50'
                    }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
