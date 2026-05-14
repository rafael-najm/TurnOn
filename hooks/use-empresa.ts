'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Empresa } from '@/lib/types'

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!data) { router.replace('/login'); return }
      setEmpresa(data)
      setLoading(false)
    }
    load()
  }, [router])

  return { empresa, loading }
}
