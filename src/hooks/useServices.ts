import { useEffect, useState } from 'react'
import { api, errorMessage } from '@/lib/api'
import type { PublicService } from '@/types'

// Servicios que se pueden reservar en /booking
export function useServices() {
  const [services, setServices] = useState<PublicService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.get<PublicService[]>('services')
      .then(data => { if (!cancelled) setServices(data) })
      .catch(err => { if (!cancelled) setError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { services, loading, error }
}
