'use client'

import { useEmpresa } from '@/hooks/use-empresa'
import TarefasClient from './tarefas-client'

export default function TarefasPage() {
  const { empresa, loading } = useEmpresa()

  if (loading || !empresa) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>
  }

  return <TarefasClient empresaId={empresa.id} initialTarefas={[]} />
}
