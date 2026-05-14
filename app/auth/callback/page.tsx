'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      router.replace('/login')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.user) {
        router.replace('/login')
        return
      }

      const { data: existing } = await supabase
        .from('empresas')
        .select('id')
        .eq('owner_id', data.user.id)
        .maybeSingle()

      if (!existing) {
        await supabase.from('empresas').insert({
          nome: data.user.email?.split('@')[0] ?? 'Minha Empresa',
          owner_id: data.user.id,
        })
      }

      router.replace('/dashboard')
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Verificando sua conta...</p>
    </div>
  )
}
