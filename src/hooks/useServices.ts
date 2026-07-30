import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service, StaffProfile } from '@/types'

export function useServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) setError(error.message)
    else setServices(data as Service[])
    setLoading(false)
  }

  return { services, loading, error, refresh: fetchServices }
}

export function useProfessionalsForService(serviceId: string | null) {
  const [professionals, setProfessionals] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!serviceId) return
    fetchProfessionals(serviceId)
  }, [serviceId])

  async function fetchProfessionals(sid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('professional_services')
      .select('professional_id, staff_profiles!inner(*)')
      .eq('service_id', sid)
      .eq('staff_profiles.is_active', true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profs = (data ?? []).map((row: any) => row.staff_profiles as StaffProfile)
    setProfessionals(profs)
    setLoading(false)
  }

  return { professionals, loading }
}
