'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { type Tarefa, TURNO_LABELS, type TurnoLabel } from '@/lib/types'

const TURNOS: TurnoLabel[] = ['manha', 'tarde', 'noite', 'todos']

type Props = {
  empresaId: string
  initialTarefas: Tarefa[]
}

export default function TarefasClient({ empresaId, initialTarefas }: Props) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(initialTarefas)
  const [titulo, setTitulo] = useState('')
  const [turno, setTurno] = useState<TurnoLabel>('todos')
  const [filtro, setFiltro] = useState<TurnoLabel | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('tarefas')
      .insert({ empresa_id: empresaId, titulo: titulo.trim(), turno, recorrente: true })
      .select()
      .single()

    if (err) {
      setError('Erro ao criar tarefa.')
    } else {
      setTarefas((prev) => [...prev, data])
      setTitulo('')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error: err } = await supabase.from('tarefas').delete().eq('id', id)
    if (!err) setTarefas((prev) => prev.filter((t) => t.id !== id))
  }

  const tarefasFiltradas =
    filtro === 'all' ? tarefas : tarefas.filter((t) => t.turno === filtro)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tarefas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie as tarefas recorrentes de cada turno</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="titulo">Nova tarefa</Label>
          <Input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Limpar balcão"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="turno-select">Turno</Label>
          <select
            id="turno-select"
            value={turno}
            onChange={(e) => setTurno(e.target.value as TurnoLabel)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {TURNOS.map((t) => (
              <option key={t} value={t}>{TURNO_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? '...' : 'Adicionar'}
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Separator />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...TURNOS] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFiltro(t)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              filtro === t
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'all' ? 'Todos' : TURNO_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Task list */}
      {tarefasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma tarefa {filtro !== 'all' ? `no turno ${TURNO_LABELS[filtro]}` : ''} cadastrada.
        </p>
      ) : (
        <div className="space-y-2">
          {tarefasFiltradas.map((tarefa) => (
            <div
              key={tarefa.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-md border border-border text-sm"
            >
              <div className="flex items-center gap-3">
                <span>{tarefa.titulo}</span>
                <Badge variant="outline" className="text-xs font-normal">
                  {TURNO_LABELS[tarefa.turno]}
                </Badge>
              </div>
              <button
                onClick={() => handleDelete(tarefa.id)}
                className="text-muted-foreground hover:text-red-600 transition-colors text-xs"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
