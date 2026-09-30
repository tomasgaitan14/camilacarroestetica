import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { errorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useAdminStore } from '@/store/adminStore'
import { BottomNav } from '@/components/shared/BottomNav'
import { FullPageSpinner } from '@/components/shared/Spinner'

export function AdminLayout() {
  const { status, check } = useAuthStore()
  const { catalog, load } = useAdminStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'checking') void check()
  }, [status, check])

  useEffect(() => {
    if (status === 'authenticated' && !catalog) {
      load().catch(err => setError(errorMessage(err)))
    }
  }, [status, catalog, load])

  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-neutral-50">
        <div className="card max-w-sm text-sm text-red-600">{error}</div>
      </div>
    )
  }
  if (status === 'checking' || !catalog) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <Outlet />
      <BottomNav />
    </div>
  )
}
