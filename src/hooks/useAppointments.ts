import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Appointment } from '@/types'

interface UseAppointmentsOptions {
  professionalId?: string  // si no se pasa, trae todos (admin)
  dateFrom?: string        // ISO string
  dateTo?: string
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAppointments()
  }, [options.professionalId, options.dateFrom, options.dateTo])

  async function fetchAppointments() {
    setLoading(true)
    let query = supabase
      .from('appointments')
      .select(`
        *,
        professional:staff_profiles(*),
        service:services(*)
      `)
      .in('status', ['confirmed'])
      .order('starts_at')

    if (options.professionalId) {
      query = query.eq('professional_id', options.professionalId)
    }
    if (options.dateFrom) {
      query = query.gte('starts_at', options.dateFrom)
    }
    if (options.dateTo) {
      query = query.lte('starts_at', options.dateTo)
    }

    const { data, error } = await query
    if (error) setError(error.message)
    else setAppointments(data as Appointment[])
    setLoading(false)
  }

  return { appointments, loading, error, refresh: fetchAppointments }
}

export function useAvailability(professionalId: string | null) {
  const [availability, setAvailability] = useState<import('@/types').Availability[]>([])
  const [blockedDates, setBlockedDates] = useState<import('@/types').BlockedDate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!professionalId) return
    fetchAvailability(professionalId)
  }, [professionalId])

  async function fetchAvailability(pid: string) {
    setLoading(true)
    const [availRes, blockedRes] = await Promise.all([
      supabase.from('availability').select('*').eq('professional_id', pid),
      supabase.from('blocked_dates').select('*').eq('professional_id', pid),
    ])
    setAvailability(availRes.data ?? [])
    setBlockedDates(blockedRes.data ?? [])
    setLoading(false)
  }

  return { availability, blockedDates, loading, refresh: () => professionalId && fetchAvailability(professionalId) }
}
