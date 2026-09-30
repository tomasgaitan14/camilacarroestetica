import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { errorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/shared/Spinner'

export default function LoginPage() {
  const { status, check, login } = useAuthStore()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'checking') void check()
  }, [status, check])

  if (status === 'authenticated') return <Navigate to="/admin" replace />
  if (status === 'checking') return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(password)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">Camila Carro</h1>
        <p className="text-neutral-500 mt-1">Panel de administración</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm card flex flex-col gap-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary flex items-center justify-center gap-2">
          {submitting && <Spinner size="sm" className="border-white/40 border-t-white" />}
          Entrar
        </button>
      </form>
    </div>
  )
}
