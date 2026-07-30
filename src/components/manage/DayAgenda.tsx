import { format, addDays, subDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { AppointmentCard } from './AppointmentCard'
import { Spinner } from '@/components/shared/Spinner'
import type { Appointment, UserRole } from '@/types'

interface DayAgendaProps {
  date: Date
  appointments: Appointment[]
  loading: boolean
  role: UserRole
  onDateChange: (date: Date) => void
  onCancel?: (id: string) => void
}

export function DayAgenda({ date, appointments, loading, role, onDateChange, onCancel }: DayAgendaProps) {
  const todayAppointments = appointments.filter(a => isSameDay(new Date(a.starts_at), date))

  return (
    <div>
      {/* Navegador de fecha */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onDateChange(subDays(date, 1))}
          className="p-2 rounded-xl active:bg-neutral-100"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="text-center">
          <p className="font-bold text-neutral-900 capitalize">
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </p>
          {isSameDay(date, new Date()) && (
            <span className="text-xs text-brand-500 font-medium">Hoy</span>
          )}
        </div>

        <button
          onClick={() => onDateChange(addDays(date, 1))}
          className="p-2 rounded-xl active:bg-neutral-100"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Botón "Hoy" */}
      {!isSameDay(date, new Date()) && (
        <button
          onClick={() => onDateChange(new Date())}
          className="w-full py-2 text-sm text-brand-500 font-medium mb-3"
        >
          Ir a hoy
        </button>
      )}

      {/* Lista de turnos */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : todayAppointments.length === 0 ? (
        <div className="text-center py-10 text-neutral-400">
          <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p className="text-sm">Sin turnos para este día</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {todayAppointments.map(appt => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              role={role}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}
