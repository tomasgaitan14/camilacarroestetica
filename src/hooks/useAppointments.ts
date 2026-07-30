import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Appointment } from '@/types'

interface UseAppointmentsOptions {
  professionalId?: string
  dateFrom?: string
  dateTo?: string
  statuses?: string[]  // default: ['confirmed', 'completed']
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAppointments()
  }, [options.professionalId, options.dateFrom, options.dateTo, (options.statuses ?? []).join(',')])

  async function fetchAppointments() {
    setLoading(true)
    const statuses = options.statuses ?? ['confirmed', 'completed']
    let query = supabase
      .from('appointments')
      .select(`
        *,
        professional:staff_profiles(*),
        service:services(*)
      `)
      .in('status', statuses)
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

export function useAvailability(professionalIds: string[]) {
  const [availability, setAvailability] = useState<import('@/types').Availability[]>([])
  const [blockedDates, setBlockedDates] = useState<import('@/types').BlockedDate[]>([])
  const [loading, setLoading] = useState(false)

  const key = professionalIds.join(',')

  useEffect(() => {
    if (professionalIds.length === 0) {
      setAvailability([])
      setBlockedDates([])
      return
    }
    fetchAvailability(professionalIds)
  }, [key])

  async function fetchAvailability(pids: string[]) {
    setLoading(true)
    const [availRes, blockedRes] = await Promise.all([
      supabase.from('availability').select('*').in('professional_id', pids),
      supabase.from('blocked_dates').select('*').in('professional_id', pids),
    ])
    setAvailability(availRes.data ?? [])
    setBlockedDates(blockedRes.data ?? [])
    setLoading(false)
  }

  return { availability, blockedDates, loading, refresh: () => professionalIds.length > 0 && fetchAvailability(professionalIds) }
}
