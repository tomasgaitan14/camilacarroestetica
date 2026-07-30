import { useState } from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import { useAppointments } from '@/hooks/useAppointments'
import { DayAgenda } from '@/components/manage/DayAgenda'
import { BottomNav } from '@/components/shared/BottomNav'
import { NewAppointmentModal } from '@/components/admin/NewAppointmentModal'
import { supabase } from '@/lib/supabase'

export default function AdminCalendarPage() {
  const { profile } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterProfId, setFilterProfId] = useState<string | undefined>(undefined)
  const [showNewModal, setShowNewModal] = useState(false)

  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00")
  const weekEnd = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59")

  // Sin filtro de profesional — trae todos
  const { appointments, loading, refresh } = useAppointments({
    professionalId: filterProfId,
    dateFrom: weekStart,
    dateTo: weekEnd,
  })

  // Lista de profesionales únicos del resultado para el filtro
  const profMap = new Map<string, string>()
  appointments.forEach(a => {
    if (a.professional) profMap.set(a.professional.id, a.professional.name)
  })
  const professionals = Array.from(profMap.entries()).map(([id, name]) => ({ id, name }))

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  function handleCancel(appointmentId: string) {
    setConfirmCancelId(appointmentId)
  }

  async function doCancel() {
    if (!confirmCancelId) return
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', confirmCancelId)
    setConfirmCancelId(null)
    refresh()
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-xs text-neutral-500">Panel admin</p>
            <p className="font-semibold text-neutral-900">{profile.name}</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-semibold active:bg-brand-600"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo
          </button>
        </div>

        {/* Filtro por profesional */}
        {professionals.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto max-w-lg mx-auto pb-0.5">
            <button
              onClick={() => setFilterProfId(undefined)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${!filterProfId ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}
            >
              Todas
            </button>
            {professionals.map(p => (
              <button
                key={p.id}
                onClick={() => setFilterProfId(p.id === filterProfId ? undefined : p.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${filterProfId === p.id ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        <DayAgenda
          date={selectedDate}
          appointments={appointments}
          loading={loading}
          role="admin"
          onDateChange={setSelectedDate}
          onCancel={handleCancel}
        />
      </main>

      <BottomNav role="admin" />

      {confirmCancelId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setConfirmCancelId(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-2xl px-4 pt-5 pb-8 safe-area-bottom"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto mb-5" />
            <p className="text-base font-bold text-neutral-900 mb-1">¿Cancelar este turno?</p>
            <p className="text-sm text-neutral-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={doCancel}
                className="w-full py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold active:bg-red-600"
              >
                Sí, cancelar turno
              </button>
              <button
                onClick={() => setConfirmCancelId(null)}
                className="w-full py-3 rounded-2xl bg-neutral-100 text-neutral-700 text-sm font-semibold active:bg-neutral-200"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewModal && profile && (
        <NewAppointmentModal
          role="admin"
          currentProfessionalId={profile.id}
          onClose={() => setShowNewModal(false)}
          onSaved={() => { setShowNewModal(false); refresh() }}
        />
      )}
    </div>
  )
}
