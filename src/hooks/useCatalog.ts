import { useState } from 'react'
import { errorMessage } from '@/lib/api'
import { useAdminStore } from '@/store/adminStore'
import type { AdminCatalog, Catalog } from '@/types'

// Catálogo ya cargado: las páginas de admin solo se muestran dentro de AdminLayout
export function useCatalog(): AdminCatalog {
  const catalog = useAdminStore(state => state.catalog)
  if (!catalog) throw new Error('useCatalog se usó fuera de AdminLayout')
  return catalog
}

// Guarda el catálogo y deja el error listo para mostrar; devuelve si se guardó
export function useCatalogSave() {
  const save = useAdminStore(state => state.save)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function persist(next: Catalog): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      await save(next)
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  return { saving, error, persist }
}
