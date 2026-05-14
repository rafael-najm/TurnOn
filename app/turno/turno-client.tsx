'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Tarefa, type Execucao, type Andamento, getTurnoAtual, TURNO_LABELS } from '@/lib/types'

type FuncionarioWithEmpresa = {
  id: string
  nome: string
  token: string
  empresa_id: string
  empresas: { nome: string } | null
}

type ExecucaoWithFuncionario = Execucao & {
  funcionarios: { nome: string } | null
}

type AndamentoWithFuncionario = Andamento & {
  funcionarios: { nome: string } | null
}

type ColeguaNome = string

export default function TurnoClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [funcionario, setFuncionario] = useState<FuncionarioWithEmpresa | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [execucoes, setExecucoes] = useState<ExecucaoWithFuncionario[]>([])
  const [andamentos, setAndamentos] = useState<AndamentoWithFuncionario[]>([])
  const [colegas, setColegas] = useState<ColeguaNome[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [turnoAtual, setTurnoAtual] = useState(getTurnoAtual)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const interval = setInterval(() => setTurnoAtual(getTurnoAtual()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!token) {
      setNotFound(true)
      return
    }
    const supabase = createClient()

    async function load() {
      const { data: func } = await supabase
        .from('funcionarios')
        .select('*, empresas(nome)')
        .eq('token', token)
        .single()

      if (!func) {
        setNotFound(true)
        return
      }
      setFuncionario(func)

      const [{ data: t }, { data: e }, { data: a }, { data: esc }] = await Promise.all([
        supabase.from('tarefas').select('*').eq('empresa_id', func.empresa_id).order('created_at'),
        supabase
          .from('execucoes')
          .select('*, funcionarios(nome)')
          .eq('data_turno', today),
        supabase
          .from('andamentos')
          .select('*, funcionarios(nome)')
          .eq('data_turno', today),
        supabase
          .from('escalas')
          .select('*, funcionarios(nome)')
          .eq('empresa_id', func.empresa_id)
          .eq('data', today)
          .eq('turno', getTurnoAtual()),
      ])

      setTarefas(t ?? [])
      setExecucoes(e ?? [])
      setAndamentos(a ?? [])

      type EscalaRow = { funcionario_id: string; funcionarios: { nome: string } | null }
      const colegasHoje = ((esc ?? []) as EscalaRow[])
        .filter((s) => s.funcionario_id !== func.id)
        .map((s) => s.funcionarios?.nome ?? '?')
      setColegas(colegasHoje)
    }
    load()

    const channel = supabase
      .channel('turno-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'execucoes' },
        async (payload) => {
          const newExec = payload.new as Execucao
          if (newExec.data_turno !== today) return
          const { data: funcData } = await supabase
            .from('funcionarios')
            .select('nome')
            .eq('id', newExec.funcionario_id)
            .single()
          setExecucoes((prev) => {
            if (prev.some((e) => e.id === newExec.id)) return prev
            return [...prev, { ...newExec, funcionarios: funcData ?? null }]
          })
          // Remove from andamentos when completed
          setAndamentos((prev) => prev.filter((a) => a.tarefa_id !== newExec.tarefa_id))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'andamentos' },
        async (payload) => {
          const newAnd = payload.new as Andamento
          if (newAnd.data_turno !== today) return
          const { data: funcData } = await supabase
            .from('funcionarios')
            .select('nome')
            .eq('id', newAnd.funcionario_id)
            .single()
          setAndamentos((prev) => {
            if (prev.some((a) => a.id === newAnd.id)) return prev
            return [...prev, { ...newAnd, funcionarios: funcData ?? null }]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'andamentos' },
        (payload) => {
          const deleted = payload.old as { id: string }
          setAndamentos((prev) => prev.filter((a) => a.id !== deleted.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [token, today])

  async function handleIniciar(tarefa: Tarefa) {
    if (!funcionario || actionLoading) return
    setActionLoading(tarefa.id + '-iniciar')
    const supabase = createClient()

    const { data, error } = await supabase
      .from('andamentos')
      .insert({
        tarefa_id: tarefa.id,
        funcionario_id: funcionario.id,
        data_turno: today,
      })
      .select('*, funcionarios(nome)')
      .single()

    if (!error && data) {
      setAndamentos((prev) => {
        if (prev.some((a) => a.id === data.id)) return prev
        return [...prev, data]
      })
    }
    // If error due to unique constraint, another employee already claimed it — just ignore
    setActionLoading(null)
  }

  async function handleConcluir(tarefa: Tarefa) {
    if (!funcionario || actionLoading) return
    const andamento = andamentos.find(
      (a) => a.tarefa_id === tarefa.id && a.funcionario_id === funcionario.id
    )
    if (!andamento) return

    setActionLoading(tarefa.id + '-concluir')
    const supabase = createClient()

    const { data: execData, error: execError } = await supabase
      .from('execucoes')
      .insert({
        tarefa_id: tarefa.id,
        funcionario_id: funcionario.id,
        data_turno: today,
      })
      .select('*, funcionarios(nome)')
      .single()

    if (!execError && execData) {
      setExecucoes((prev) => [...prev, execData])
      // Delete from andamentos
      await supabase.from('andamentos').delete().eq('id', andamento.id)
      setAndamentos((prev) => prev.filter((a) => a.id !== andamento.id))
    }
    setActionLoading(null)
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Link inválido</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Este link de turno não foi encontrado.
          </p>
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

  const tarefasDoTurno = tarefas.filter(
    (t) => t.turno === turnoAtual || t.turno === 'todos'
  )
  const totalFeitas = tarefasDoTurno.filter((t) =>
    execucoes.some((e) => e.tarefa_id === t.id)
  ).length
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
            Turno:{' '}
            <span className="font-medium text-foreground">{TURNO_LABELS[turnoAtual]}</span>
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              {totalFeitas}/{total} tarefas
            </span>
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

        {colegas.length > 0 && (
          <div className="mb-6 py-3 px-4 bg-muted/40 border border-border rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Colegas de turno
            </p>
            <div className="flex flex-wrap gap-1.5">
              {colegas.map((nome, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-border text-foreground"
                >
                  {nome}
                </span>
              ))}
            </div>
          </div>
        )}

        {tarefasDoTurno.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            Nenhuma tarefa para este turno.
          </p>
        ) : (
          <div className="space-y-3">
            {tarefasDoTurno.map((tarefa) => {
              const exec = execucoes.find((e) => e.tarefa_id === tarefa.id)
              const andamento = andamentos.find((a) => a.tarefa_id === tarefa.id)
              const myAndamento =
                andamento && andamento.funcionario_id === funcionario.id
                  ? andamento
                  : null
              const othersAndamento =
                andamento && andamento.funcionario_id !== funcionario.id
                  ? andamento
                  : null

              if (exec) {
                // Concluído
                return (
                  <div
                    key={tarefa.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/40"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground border-2 border-foreground flex items-center justify-center">
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path
                          d="M1 5L4.5 8.5L11 1.5"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium line-through text-muted-foreground">
                        {tarefa.titulo}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {exec.funcionarios?.nome ?? '—'} ·{' '}
                        {new Date(exec.feito_em).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                )
              }

              if (othersAndamento) {
                // Em andamento por outra pessoa
                return (
                  <div
                    key={tarefa.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50/50"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {tarefa.titulo}
                      </span>
                      <span className="text-xs text-amber-700 flex-shrink-0">
                        Em andamento · {othersAndamento.funcionarios?.nome ?? '—'}
                      </span>
                    </div>
                  </div>
                )
              }

              if (myAndamento) {
                // Em andamento por mim
                const isConcluding = actionLoading === tarefa.id + '-concluir'
                return (
                  <div
                    key={tarefa.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-amber-300 bg-amber-50"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {tarefa.titulo}
                      </span>
                      <button
                        onClick={() => handleConcluir(tarefa)}
                        disabled={!!actionLoading}
                        className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-md font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors flex-shrink-0"
                      >
                        {isConcluding ? 'Concluindo...' : 'Concluir'}
                      </button>
                    </div>
                  </div>
                )
              }

              // Pendente
              const isStarting = actionLoading === tarefa.id + '-iniciar'
              return (
                <button
                  key={tarefa.id}
                  onClick={() => handleIniciar(tarefa)}
                  disabled={!!actionLoading}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-lg border border-border bg-white hover:border-foreground/30 hover:shadow-sm cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isStarting
                        ? 'border-muted-foreground animate-pulse'
                        : 'border-border'
                    }`}
                  />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {tarefa.titulo}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {isStarting ? 'Iniciando...' : 'Iniciar'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-8">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  )
}
