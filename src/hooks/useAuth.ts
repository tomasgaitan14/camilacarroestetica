import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { StaffProfile } from '@/types'

export function useAuth() {
  const { session, user, profile, isLoading, setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // Carga la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escucha cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)

      if (session?.user) {
        if (session.provider_refresh_token && event === 'SIGNED_IN') {
          await saveGoogleRefreshToken(session.user.id, session.provider_refresh_token)
        }
        // En TOKEN_REFRESHED solo actualizamos la sesión, no recargamos el perfil
        if (event !== 'TOKEN_REFRESHED') {
          await loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data as StaffProfile | null)
    setLoading(false)
  }

  async function saveGoogleRefreshToken(userId: string, refreshToken: string) {
    // Guarda el refresh token vía Edge Function para que se cifre antes de persistir
    await supabase.functions.invoke('save-google-token', {
      body: { user_id: userId, refresh_token: refreshToken },
    })
  }

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

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, user, profile, isLoading, signInWithGoogle, signOut }
}
