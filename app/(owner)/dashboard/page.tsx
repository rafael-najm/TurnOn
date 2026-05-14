'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/hooks/use-empresa'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { type Tarefa, TURNO_LABELS } from '@/lib/types'

type ExecucaoWithFuncionario = {
  id: string
  tarefa_id: string
  funcionario_id: string
  feito_em: string
  data_turno: string
  funcionarios: { nome: string } | null
}

const TURNOS = ['manha', 'tarde', 'noite']

function getTurnoAtualLabel() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'manha'
  if (hour >= 12 && hour < 18) return 'tarde'
  return 'noite'
}

export default function DashboardPage() {
  const { empresa, loading: authLoading } = useEmpresa()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [execucoes, setExecucoes] = useState<ExecucaoWithFuncionario[]>([])
  const turnoAtual = getTurnoAtualLabel()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!empresa) return
    const supabase = createClient()

    async function load() {
      const [{ data: t }, { data: e }] = await Promise.all([
        supabase.from('tarefas').select('*').eq('empresa_id', empresa!.id).order('turno'),
        supabase.from('execucoes').select('*, funcionarios(nome)').eq('data_turno', today),
      ])
      setTarefas(t ?? [])
      setExecucoes(e ?? [])
    }
    load()

    const channel = supabase
      .channel('execucoes-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'execucoes' }, async (payload) => {
        const newExec = payload.new as ExecucaoWithFuncionario
        if (newExec.data_turno !== today) return
        const { data: func } = await supabase.from('funcionarios').select('nome').eq('id', newExec.funcionario_id).single()
        setExecucoes((prev) => [...prev, { ...newExec, funcionarios: func ?? null }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [empresa, today])

  function getTarefasDoTurno(turno: string) {
    return tarefas.filter((t) => t.turno === turno || t.turno === 'todos')
  }

  function contarFeitas(turno: string) {
    const ids = getTarefasDoTurno(turno).map((t) => t.id)
    return execucoes.filter((e) => ids.includes(e.tarefa_id)).length
  }

  if (authLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{empresa?.nome}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Painel do dia — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TURNOS.map((turno) => {
          const total = getTarefasDoTurno(turno).length
          const feitas = contarFeitas(turno)
          const pct = total > 0 ? Math.round((feitas / total) * 100) : 0
          const isAtual = turno === turnoAtual
          return (
            <Card key={turno} className={`border shadow-none ${isAtual ? 'border-foreground' : 'border-border'}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{TURNO_LABELS[turno]}</CardTitle>
                  {isAtual && <Badge variant="outline" className="text-xs">Agora</Badge>}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <Progress value={pct} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{feitas}/{total} tarefas concluídas</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      <div className="space-y-8">
        {TURNOS.map((turno) => {
          const lista = getTarefasDoTurno(turno)
          if (lista.length === 0) return null
          return (
            <div key={turno}>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                {TURNO_LABELS[turno]}
                {turno === turnoAtual && <span className="text-xs font-normal text-muted-foreground">(turno atual)</span>}
              </h2>
              <div className="space-y-2">
                {lista.map((tarefa) => {
                  const exec = execucoes.find((e) => e.tarefa_id === tarefa.id)
                  return (
                    <div key={tarefa.id} className="flex items-center justify-between py-2.5 px-3 rounded-md border border-border text-sm">
                      <span className={exec ? 'line-through text-muted-foreground' : ''}>{tarefa.titulo}</span>
                      {exec ? (
                        <span className="text-xs text-muted-foreground">
                          {exec.funcionarios?.nome ?? '—'} · {new Date(exec.feito_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pendente</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {tarefas.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma tarefa cadastrada. <a href="/tarefas" className="underline">Adicione em Tarefas</a>.
          </p>
        )}
      </div>
    </div>
  )
}
