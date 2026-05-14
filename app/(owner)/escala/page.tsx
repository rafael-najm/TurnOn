'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/hooks/use-empresa'
import { type Funcionario, type Escala } from '@/lib/types'

const TURNOS: Array<'manha' | 'tarde' | 'noite'> = ['manha', 'tarde', 'noite']
const TURNO_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
}

const CHIP_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const startDay = monday.getDate()
  const endDay = sunday.getDate()
  const month = sunday.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${startDay} — ${endDay} de ${month}`
}

export default function EscalaPage() {
  const { empresa, loading: authLoading } = useEmpresa()
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [addingCell, setAddingCell] = useState<string | null>(null)
  const [selectedFuncionario, setSelectedFuncionario] = useState<Record<string, string>>({})

  const today = toLocalISODate(new Date())

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const loadEscalas = useCallback(async () => {
    if (!empresa) return
    const supabase = createClient()
    const startStr = toLocalISODate(weekStart)
    const endStr = toLocalISODate(addDays(weekStart, 6))
    const { data } = await supabase
      .from('escalas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .gte('data', startStr)
      .lte('data', endStr)
    setEscalas(data ?? [])
  }, [empresa, weekStart])

  useEffect(() => {
    if (!empresa) return
    const supabase = createClient()
    supabase
      .from('funcionarios')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('created_at')
      .then(({ data }) => setFuncionarios(data ?? []))
  }, [empresa])

  useEffect(() => {
    loadEscalas()
  }, [loadEscalas])

  function getEscalasForCell(date: string, turno: string): Escala[] {
    return escalas.filter((e) => e.data === date && e.turno === turno)
  }

  function getFuncionariosNotInCell(date: string, turno: string): Funcionario[] {
    const inCell = getEscalasForCell(date, turno).map((e) => e.funcionario_id)
    return funcionarios.filter((f) => !inCell.includes(f.id))
  }

  function cellKey(date: string, turno: string) {
    return `${date}-${turno}`
  }

  async function handleAddEscala(date: string, turno: 'manha' | 'tarde' | 'noite') {
    const key = cellKey(date, turno)
    const funcionarioId = selectedFuncionario[key]
    if (!funcionarioId || !empresa) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('escalas')
      .insert({ empresa_id: empresa.id, funcionario_id: funcionarioId, turno, data: date })
      .select()
      .single()

    if (!error && data) {
      setEscalas((prev) => [...prev, data])
      setSelectedFuncionario((prev) => ({ ...prev, [key]: '' }))
      setAddingCell(null)
    }
  }

  async function handleRemoveEscala(escalaId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('escalas').delete().eq('id', escalaId)
    if (!error) {
      setEscalas((prev) => prev.filter((e) => e.id !== escalaId))
    }
  }

  function getChipColor(funcionarioId: string): string {
    const index = funcionarios.findIndex((f) => f.id === funcionarioId)
    return CHIP_COLORS[index % CHIP_COLORS.length]
  }

  function getFirstName(nome: string): string {
    return nome.split(' ')[0]
  }

  if (authLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-semibold">Escala</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
            className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            ‹ Anterior
          </button>
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Próxima ›
          </button>
          <span className="text-sm text-muted-foreground ml-1">{formatWeekRange(weekStart)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: '700px' }}>
          <thead>
            <tr>
              <th className="w-20 py-2 px-3 text-left text-xs font-medium text-muted-foreground border border-border bg-muted/30">
                Turno
              </th>
              {weekDays.map((day) => {
                const dateStr = toLocalISODate(day)
                const isToday = dateStr === today
                return (
                  <th
                    key={dateStr}
                    className={`py-2 px-3 text-center text-xs font-medium border border-border ${
                      isToday ? 'bg-foreground text-background' : 'bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </div>
                    <div className={isToday ? 'text-background/80' : 'text-muted-foreground'}>
                      {formatDateBR(day)}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {TURNOS.map((turno) => (
              <tr key={turno}>
                <td className="py-2 px-3 text-xs font-medium text-muted-foreground border border-border bg-muted/10 align-top">
                  {TURNO_LABELS[turno]}
                </td>
                {weekDays.map((day) => {
                  const dateStr = toLocalISODate(day)
                  const isToday = dateStr === today
                  const key = cellKey(dateStr, turno)
                  const cellEscalas = getEscalasForCell(dateStr, turno)
                  const available = getFuncionariosNotInCell(dateStr, turno)
                  const isAdding = addingCell === key

                  return (
                    <td
                      key={dateStr}
                      className={`py-2 px-2 border border-border align-top ${
                        isToday ? 'bg-foreground/5' : 'bg-white'
                      }`}
                      style={{ minWidth: '110px' }}
                    >
                      <div className="flex flex-wrap gap-1 mb-1">
                        {cellEscalas.map((esc) => {
                          const func = funcionarios.find((f) => f.id === esc.funcionario_id)
                          if (!func) return null
                          return (
                            <span
                              key={esc.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getChipColor(esc.funcionario_id)}`}
                            >
                              {getFirstName(func.nome)}
                              <button
                                onClick={() => handleRemoveEscala(esc.id)}
                                className="opacity-60 hover:opacity-100 leading-none"
                                aria-label={`Remover ${func.nome}`}
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>

                      {isAdding ? (
                        <div className="flex items-center gap-1 mt-1">
                          <select
                            className="text-xs border border-border rounded px-1 py-0.5 flex-1 bg-white"
                            value={selectedFuncionario[key] ?? ''}
                            onChange={(e) =>
                              setSelectedFuncionario((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                          >
                            <option value="">Selecionar...</option>
                            {available.map((f) => (
                              <option key={f.id} value={f.id}>
                                {getFirstName(f.nome)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddEscala(dateStr, turno)}
                            className="text-xs px-1.5 py-0.5 bg-foreground text-background rounded hover:opacity-80"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => { setAddingCell(null) }}
                            className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-muted"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        available.length > 0 && (
                          <button
                            onClick={() => setAddingCell(key)}
                            className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded px-2 py-0.5 mt-1 hover:border-foreground transition-colors"
                          >
                            + add
                          </button>
                        )
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
