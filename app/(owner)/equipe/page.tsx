'use client'

import { useEmpresa } from '@/hooks/use-empresa'
import EquipeClient from './equipe-client'

export default function EquipePage() {
  const { empresa, loading } = useEmpresa()

  if (loading || !empresa) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>
  }

  return <EquipeClient empresaId={empresa.id} initialFuncionarios={[]} />
}
