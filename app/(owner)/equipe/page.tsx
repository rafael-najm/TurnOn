import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EquipeClient from './equipe-client'

export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!empresa) redirect('/dashboard')

  const { data: funcionarios } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('empresa_id', empresa.id)
    .order('created_at')

  return <EquipeClient empresaId={empresa.id} initialFuncionarios={funcionarios ?? []} />
}
