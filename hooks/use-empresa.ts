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

      let { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!data) {
        const { data: created } = await supabase
          .from('empresas')
          .insert({ nome: user.email?.split('@')[0] ?? 'Minha Empresa', owner_id: user.id })
          .select()
          .single()
        data = created
      }

      if (!data) { router.replace('/login'); return }
      setEmpresa(data)
      setLoading(false)
    }
    load()
  }, [router])

  return { empresa, loading }
}
