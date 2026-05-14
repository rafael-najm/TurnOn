import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!empresa) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Nenhuma empresa encontrada. Faça logout e cadastre-se novamente.</p>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  const [{ data: tarefas }, { data: execucoes }, { data: funcionarios }] = await Promise.all([
    supabase.from('tarefas').select('*').eq('empresa_id', empresa.id).order('turno'),
    supabase.from('execucoes').select('*, funcionarios(nome)').eq('data_turno', today),
    supabase.from('funcionarios').select('*').eq('empresa_id', empresa.id),
  ])

  return (
    <DashboardClient
      empresa={empresa}
      initialTarefas={tarefas ?? []}
      initialExecucoes={execucoes ?? []}
      funcionarios={funcionarios ?? []}
    />
  )
}
