import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TarefasClient from './tarefas-client'

export default async function TarefasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!empresa) redirect('/dashboard')

  const { data: tarefas } = await supabase
    .from('tarefas')
    .select('*')
    .eq('empresa_id', empresa.id)
    .order('turno')
    .order('created_at')

  return <TarefasClient empresaId={empresa.id} initialTarefas={tarefas ?? []} />
}
