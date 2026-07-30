import { useState } from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import { useAppointments } from '@/hooks/useAppointments'
import { DayAgenda } from '@/components/manage/DayAgenda'
import { BottomNav } from '@/components/shared/BottomNav'
import { supabase } from '@/lib/supabase'

export default function ManageCalendarPage() {
  const { profile } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date())

  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00")
  const weekEnd = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59")

  const { appointments, loading, refresh } = useAppointments({
    professionalId: profile?.id,
    dateFrom: weekStart,
    dateTo: weekEnd,
  })

  async function handleCancel(appointmentId: string) {
    if (!window.confirm('¿Cancelar este turno?')) return
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId)
    refresh()
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-xs text-neutral-500">Hola,</p>
            <p className="font-semibold text-neutral-900">{profile.name}</p>
          </div>
          <button
            onClick={() => {
              // El modal de nuevo turno va acá
              alert('Modal nuevo turno — próxima iteración')
            }}
            className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-semibold active:bg-brand-600"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo turno
          </button>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        <DayAgenda
          date={selectedDate}
          appointments={appointments}
          loading={loading}
          role="professional"
          onDateChange={setSelectedDate}
          onCancel={handleCancel}
        />
      </main>

      <BottomNav role="professional" />
    </div>
  )
}
