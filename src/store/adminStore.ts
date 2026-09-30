import { create } from 'zustand'
import { HTTP_STATUS } from '../../shared/http'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { AdminCatalog, Catalog } from '@/types'

interface AdminStore {
  catalog: AdminCatalog | null
  load: () => Promise<void>
  // Guarda el catálogo entero; lanza ApiError para que la página muestre el problema
  save: (next: Catalog) => Promise<void>
}

async function withSession<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    if (error instanceof ApiError && error.status === HTTP_STATUS.UNAUTHORIZED) useAuthStore.getState().expire()
    throw error
  }
}

export const useAdminStore = create<AdminStore>((set) => ({
  catalog: null,
  load: async () => {
    set({ catalog: await withSession(() => api.get<AdminCatalog>('admin/catalog')) })
  },
  save: async (next) => {
    const { services, professionals, availability } = next
    set({ catalog: await withSession(() => api.put<AdminCatalog>('admin/catalog', { services, professionals, availability })) })
  },
}))
