import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { StaffProfile } from '@/types'

interface AuthStore {
  session: Session | null
  user: User | null
  profile: StaffProfile | null
  isLoading: boolean
  initialized: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: StaffProfile | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: () => set({ initialized: true }),
}))
