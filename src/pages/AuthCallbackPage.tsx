import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { FullPageSpinner } from '@/components/shared/Spinner'

// Supabase redirige acá después del OAuth con el token en el hash/query
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('staff_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role === 'admin') navigate('/admin/calendar', { replace: true })
            else if (data?.role === 'professional') navigate('/manage/calendar', { replace: true })
            else navigate('/login', { replace: true })
          })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [])

  return <FullPageSpinner />
}
