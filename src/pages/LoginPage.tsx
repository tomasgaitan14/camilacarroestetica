import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/shared/Spinner'

export default function LoginPage() {
  // Lee del store — la suscripción ya está manejada en App via useAuth()
  const { profile, initialized, session } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (initialized && profile) {
      navigate(profile.role === 'admin' ? '/admin/calendar' : '/manage/calendar', { replace: true })
    }
  }, [profile, initialized])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (!initialized) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  // Usuario autenticado pero sin perfil en staff_profiles
  const noAccess = initialized && session && !profile

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="mb-8 text-center">
        <img
          src="/logo.png"
          alt="Camila Carro Estética"
          className="w-28 h-28 rounded-full mx-auto mb-4 object-cover"
          onError={e => {
            const t = e.currentTarget
            t.style.display = 'none'
            const fallback = document.getElementById('login-logo-fallback')
            if (fallback) fallback.style.display = 'flex'
          }}
        />
        <div
          id="login-logo-fallback"
          className="w-28 h-28 bg-brand-500 rounded-full items-center justify-center mx-auto mb-4 hidden"
        >
          <span className="text-white text-4xl font-bold">CC</span>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Camila Carro</h1>
        <p className="text-neutral-500 mt-1">Estética y cuidado personal</p>
      </div>

      <div className="w-full max-w-sm card">
        {noAccess ? (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Sin acceso</h2>
            <p className="text-sm text-neutral-500 mb-5">
              Tu cuenta no tiene acceso al panel. Contactá a Camila para que te agregue al equipo.
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full py-3 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 active:bg-neutral-50"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Panel de gestión</h2>
            <p className="text-sm text-neutral-500 mb-6">
              Acceso exclusivo para el equipo. Iniciá sesión con tu cuenta de Google.
            </p>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 text-sm active:bg-neutral-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
