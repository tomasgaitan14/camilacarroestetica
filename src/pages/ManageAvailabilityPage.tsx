import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useAvailability } from '@/hooks/useAppointments'
import { supabase } from '@/lib/supabase'
import { DAY_LABELS } from '@/lib/utils'
import { BottomNav } from '@/components/shared/BottomNav'
import { Spinner } from '@/components/shared/Spinner'
import type { Availability } from '@/types'

const DAYS = [1, 2, 3, 4, 5, 6, 0]  // lun–dom

export default function ManageAvailabilityPage() {
  const { profile } = useAuthStore()
  const { availability, loading, refresh } = useAvailability(profile?.id ?? null)
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  async function handleDelete(id: string) {
    await supabase.from('availability').delete().eq('id', id)
    refresh()
  }

  async function handleAdd(dayOfWeek: number, startTime: string, endTime: string) {
    if (!startTime || !endTime || startTime >= endTime) {
      alert('Hora de inicio debe ser antes que la hora de fin.')
      return
    }
    setSaving(true)
    await supabase.from('availability').insert({
      professional_id: profile!.id,
      day_of_week: dayOfWeek,
      start_time: startTime + ':00',
      end_time: endTime + ':00',
    })
    await refresh()
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-semibold text-neutral-900">Mis horarios</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Configurá en qué días y horarios trabajás</p>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="flex flex-col gap-4">
            {DAYS.map(day => {
              const daySlots = availability.filter(a => a.day_of_week === day)
              return (
                <DayAvailabilityRow
                  key={day}
                  dayIndex={day}
                  dayLabel={DAY_LABELS[day]}
                  slots={daySlots}
                  saving={saving}
                  onAdd={(start, end) => handleAdd(day, start, end)}
                  onDelete={handleDelete}
                />
              )
            })}
          </div>
        )}
      </main>

      <BottomNav role="professional" />
    </div>
  )
}

interface DayRowProps {
  dayIndex: number
  dayLabel: string
  slots: Availability[]
  saving: boolean
  onAdd: (start: string, end: string) => void
  onDelete: (id: string) => void
}

function DayAvailabilityRow({ dayLabel, slots, saving, onAdd, onDelete }: DayRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-800 w-24">{dayLabel}</span>
          {slots.length > 0 ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
              {slots.length} bloque{slots.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-neutral-400">No disponible</span>
          )}
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          {/* Bloques existentes */}
          {slots.map(slot => (
            <div key={slot.id} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-neutral-700">
                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
              </span>
              <button
                onClick={() => onDelete(slot.id)}
                className="text-xs text-red-500 font-medium"
              >
                Eliminar
              </button>
            </div>
          ))}

          {/* Agregar nuevo bloque */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
            />
            <span className="text-neutral-400 text-sm">a</span>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
            />
            <button
              onClick={() => onAdd(startTime, endTime)}
              disabled={saving}
              className="px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold active:bg-brand-600 disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
