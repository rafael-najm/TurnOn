'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Tarefa, type Execucao, getTurnoAtual, TURNO_LABELS } from '@/lib/types'

type FuncionarioWithEmpresa = {
  id: string
  nome: string
  token: string
  empresa_id: string
  empresas: { nome: string } | null
}

export default function TurnoClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [funcionario, setFuncionario] = useState<FuncionarioWithEmpresa | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [execucoes, setExecucoes] = useState<Execucao[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [turnoAtual, setTurnoAtual] = useState(getTurnoAtual)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const interval = setInterval(() => setTurnoAtual(getTurnoAtual()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!token) { setNotFound(true); return }
    const supabase = createClient()

    async function load() {
      const { data: func } = await supabase
        .from('funcionarios')
        .select('*, empresas(nome)')
        .eq('token', token)
        .single()

      if (!func) { setNotFound(true); return }
      setFuncionario(func)

      const [{ data: t }, { data: e }] = await Promise.all([
        supabase.from('tarefas').select('*').eq('empresa_id', func.empresa_id).order('created_at'),
        supabase.from('execucoes').select('*').eq('data_turno', today),
      ])
      setTarefas(t ?? [])
      setExecucoes(e ?? [])
    }
    load()
  }, [token, today])

  const isFeita = useCallback(
    (tarefaId: string) => execucoes.some((e) => e.tarefa_id === tarefaId),
    [execucoes]
  )

  async function handleCheck(tarefa: Tarefa) {
    if (isFeita(tarefa.id) || loadingId || !funcionario) return
    setLoadingId(tarefa.id)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('execucoes')
      .insert({ tarefa_id: tarefa.id, funcionario_id: funcionario.id, data_turno: today })
      .select()
      .single()
    if (!error && data) setExecucoes((prev) => [...prev, data])
    setLoadingId(null)
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Link inválido</h1>
          <p className="text-sm text-muted-foreground mt-2">Este link de turno não foi encontrado.</p>
        </div>
      </div>
    )
  }

  if (!funcionario) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  const tarefasDoTurno = tarefas.filter((t) => t.turno === turnoAtual || t.turno === 'todos')
  const totalFeitas = tarefasDoTurno.filter((t) => isFeita(t.id)).length
  const total = tarefasDoTurno.length
  const pct = total > 0 ? Math.round((totalFeitas / total) * 100) : 0
  const todasFeitas = total > 0 && totalFeitas === total

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {funcionario.empresas?.nome ?? ''}
          </p>
          <h1 className="text-xl font-semibold mt-1">Olá, {funcionario.nome}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Turno: <span className="font-medium text-foreground">{TURNO_LABELS[turnoAtual]}</span>
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{totalFeitas}/{total} tarefas</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {todasFeitas && (
          <div className="mb-4 py-3 px-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 text-center font-medium">
            Todas as tarefas do turno concluídas!
          </div>
        )}

        {tarefasDoTurno.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            Nenhuma tarefa para este turno.
          </p>
        ) : (
          <div className="space-y-3">
            {tarefasDoTurno.map((tarefa) => {
              const feita = isFeita(tarefa.id)
              const isLoading = loadingId === tarefa.id
              return (
                <button
                  key={tarefa.id}
                  onClick={() => handleCheck(tarefa)}
                  disabled={feita || !!isLoading}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-lg border transition-all active:scale-[0.98] ${
                    feita
                      ? 'border-border bg-muted/40 cursor-default'
                      : 'border-border bg-white hover:border-foreground/30 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    feita ? 'bg-foreground border-foreground' : isLoading ? 'border-muted-foreground animate-pulse' : 'border-border'
                  }`}>
                    {feita && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${feita ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {tarefa.titulo}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-8">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
