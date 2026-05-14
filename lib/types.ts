export type Empresa = {
  id: string
  nome: string
  owner_id: string
  created_at: string
}

export type Funcionario = {
  id: string
  empresa_id: string
  nome: string
  token: string
  created_at: string
}

export type Tarefa = {
  id: string
  empresa_id: string
  titulo: string
  turno: 'manha' | 'tarde' | 'noite' | 'todos'
  recorrente: boolean
  created_at: string
}

export type Execucao = {
  id: string
  tarefa_id: string
  funcionario_id: string
  feito_em: string
  data_turno: string
}

export type TurnoLabel = 'manha' | 'tarde' | 'noite' | 'todos'

export function getTurnoAtual(): 'manha' | 'tarde' | 'noite' {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'manha'
  if (hour >= 12 && hour < 18) return 'tarde'
  return 'noite'
}

export const TURNO_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  todos: 'Todos os turnos',
}
