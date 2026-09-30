import { create } from 'zustand'
import { api, ApiError } from '@/lib/api'
import type { SessionResponse } from '@/types'

type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

interface AuthStore {
  status: AuthStatus
  check: () => Promise<void>
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  expire: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'checking',
  check: async () => {
    try {
      const { authenticated } = await api.get<SessionResponse>('session')
      set({ status: authenticated ? 'authenticated' : 'anonymous' })
    } catch (error) {
      // Sin respuesta válida se muestra el login, que informa el error al intentar entrar
      if (!(error instanceof ApiError || error instanceof TypeError)) throw error
      set({ status: 'anonymous' })
    }
  },
  // Lanza ApiError si la contraseña no es correcta
  login: async (password) => {
    await api.post<SessionResponse>('session', { password })
    set({ status: 'authenticated' })
  },
  logout: async () => {
    await api.delete<SessionResponse>('session')
    set({ status: 'anonymous' })
  },
  // La API respondió 401: la cookie venció o se cambió el secreto
  expire: () => set({ status: 'anonymous' }),
}))
