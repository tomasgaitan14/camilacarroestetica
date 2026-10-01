import { useState } from 'react'
import { useCatalog, useCatalogSave } from '@/hooks/useCatalog'
import { DAY_LABELS } from '@/lib/utils'
import type { Availability } from '@/types'

const DAYS = [1, 2, 3, 4, 5, 6, 0]  // lunes a domingo
const DEFAULT_START = '09:00'
const DEFAULT_END = '18:00'

export default function AdminAvailabilityPage() {
  const catalog = useCatalog()
  const { saving, error, persist } = useCatalogSave()
  const [selectedId, setSelectedId] = useState<string | null>(catalog.professionals[0]?.id ?? null)

  const professional = catalog.professionals.find(p => p.id === selectedId)

  async function handleAdd(dayOfWeek: number, startTime: string, endTime: string) {
    if (!professional) return
    const block: Availability = { professional_id: professional.id, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime }
    await persist({ ...catalog, availability: [...catalog.availability, block] })
  }

  async function handleDelete(block: Availability) {
    await persist({ ...catalog, availability: catalog.availability.filter(b => b !== block) })
  }

  return (
    <>
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-semibold text-neutral-900">Horarios</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Qué días y en qué horario atiende cada profesional</p>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-4">
        {catalog.professionals.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-sm">Primero agregá profesionales en Equipo.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {catalog.professionals.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                  ${p.id === selectedId ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-neutral-600 border-neutral-200'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {professional && DAYS.map(day => (
          <DayRow
            key={`${professional.id}-${day}`}
            dayLabel={DAY_LABELS[day]}
            blocks={catalog.availability.filter(b => b.professional_id === professional.id && b.day_of_week === day)}
            saving={saving}
            onAdd={(start, end) => handleAdd(day, start, end)}
            onDelete={handleDelete}
          />
        ))}
      </main>
    </>
  )
}

interface DayRowProps {
  dayLabel: string
  blocks: Availability[]
  saving: boolean
  onAdd: (start: string, end: string) => void
  onDelete: (block: Availability) => void
}

function DayRow({ dayLabel, blocks, saving, onAdd, onDelete }: DayRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [startTime, setStartTime] = useState(DEFAULT_START)
  const [endTime, setEndTime] = useState(DEFAULT_END)

  const sorted = [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const invalidRange = startTime >= endTime

  return (
    <div className="card">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-800 w-24 text-left">{dayLabel}</span>
          {blocks.length > 0 ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
              {sorted.map(b => `${b.start_time}–${b.end_time}`).join(', ')}
            </span>
          ) : (
            <span className="text-xs text-neutral-400">No atiende</span>
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
          {sorted.map(block => (
            <div key={`${block.start_time}-${block.end_time}`} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-neutral-700">{block.start_time} – {block.end_time}</span>
              <button onClick={() => onDelete(block)} disabled={saving} className="text-xs text-red-500 font-medium">
                Eliminar
              </button>
            </div>
          ))}

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
              disabled={saving || invalidRange}
              className="px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold active:bg-brand-600 disabled:opacity-50"
            >
              +
            </button>
          </div>
          {invalidRange && <p className="text-xs text-red-500 mt-1">El inicio tiene que ser antes del fin.</p>}
        </div>
      )}
    </div>
  )
}
