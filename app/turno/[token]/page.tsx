import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TurnoClient from './turno-client'

export default async function TurnoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: funcionario } = await supabase
    .from('funcionarios')
    .select('*, empresas(nome)')
    .eq('token', token)
    .single()

  if (!funcionario) notFound()

  const today = new Date().toISOString().split('T')[0]

  const { data: tarefas } = await supabase
    .from('tarefas')
    .select('*')
    .eq('empresa_id', funcionario.empresa_id)
    .order('created_at')

  const { data: execucoes } = await supabase
    .from('execucoes')
    .select('*')
    .eq('data_turno', today)

  return (
    <TurnoClient
      funcionario={funcionario}
      initialTarefas={tarefas ?? []}
      initialExecucoes={execucoes ?? []}
    />
  )
}
