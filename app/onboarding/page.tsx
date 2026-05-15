'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Empresa } from '@/lib/types'

const TOTAL_STEPS = 5

const TURNO_CONFIGS = [
  { key: 'manha', label: 'Manhã', defaultInicio: '06:00', defaultFim: '12:00' },
  { key: 'tarde', label: 'Tarde', defaultInicio: '12:00', defaultFim: '18:00' },
  { key: 'noite', label: 'Noite', defaultInicio: '18:00', defaultFim: '06:00' },
]

const TURNO_OPTIONS = ['manha', 'tarde', 'noite', 'todos'] as const
const TURNO_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  todos: 'Todos',
}

type TarefaInput = { titulo: string; turno: string }
type FuncInput = { nome: string }

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Step 1 — company name
  const [nome, setNome] = useState('')

  // Step 2 — shift hours
  const [horarios, setHorarios] = useState({
    manha_inicio: '06:00',
    manha_fim: '12:00',
    tarde_inicio: '12:00',
    tarde_fim: '18:00',
    noite_inicio: '18:00',
    noite_fim: '06:00',
  })

  // Step 3 — tasks
  const [tarefas, setTarefas] = useState<TarefaInput[]>([{ titulo: '', turno: 'todos' }])

  // Step 4 — employees
  const [funcionarios, setFuncionarios] = useState<FuncInput[]>([{ nome: '' }])

  // Step 5 — summary counts
  const [savedTarefas, setSavedTarefas] = useState(0)
  const [savedFuncs, setSavedFuncs] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!data) { router.replace('/login'); return }

      if (data.onboarding_concluido) { router.replace('/dashboard'); return }

      setEmpresa(data)
      setNome(data.nome ?? '')
      if (data.horario_manha_inicio) {
        setHorarios({
          manha_inicio: data.horario_manha_inicio,
          manha_fim: data.horario_manha_fim ?? '12:00',
          tarde_inicio: data.horario_tarde_inicio ?? '12:00',
          tarde_fim: data.horario_tarde_fim ?? '18:00',
          noite_inicio: data.horario_noite_inicio ?? '18:00',
          noite_fim: data.horario_noite_fim ?? '06:00',
        })
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleNext() {
    if (!empresa) return
    if (step === 1) await saveStep1()
    else if (step === 2) await saveStep2()
    else if (step === 3) await saveStep3()
    else if (step === 4) await saveStep4()
  }

  async function saveStep1() {
    if (!nome.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('empresas').update({ nome: nome.trim() }).eq('id', empresa!.id)
    setEmpresa((prev) => prev ? { ...prev, nome: nome.trim() } : prev)
    setSaving(false)
    setStep(2)
  }

  async function saveStep2() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('empresas').update({
      horario_manha_inicio: horarios.manha_inicio,
      horario_manha_fim: horarios.manha_fim,
      horario_tarde_inicio: horarios.tarde_inicio,
      horario_tarde_fim: horarios.tarde_fim,
      horario_noite_inicio: horarios.noite_inicio,
      horario_noite_fim: horarios.noite_fim,
    }).eq('id', empresa!.id)
    setSaving(false)
    setStep(3)
  }

  async function saveStep3() {
    setSaving(true)
    const valid = tarefas.filter((t) => t.titulo.trim())
    if (valid.length > 0) {
      const supabase = createClient()
      await supabase.from('tarefas').insert(
        valid.map((t) => ({
          empresa_id: empresa!.id,
          titulo: t.titulo.trim(),
          turno: t.turno,
          recorrente: true,
        }))
      )
      setSavedTarefas(valid.length)
    }
    setSaving(false)
    setStep(4)
  }

  async function saveStep4() {
    setSaving(true)
    const valid = funcionarios.filter((f) => f.nome.trim())
    if (valid.length > 0) {
      const supabase = createClient()
      await supabase.from('funcionarios').insert(
        valid.map((f) => ({ empresa_id: empresa!.id, nome: f.nome.trim() }))
      )
      setSavedFuncs(valid.length)
    }
    setSaving(false)
    await finish()
  }

  async function finish() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('empresas').update({ onboarding_concluido: true }).eq('id', empresa!.id)
    setSaving(false)
    setStep(5)
  }

  function addTarefa() {
    setTarefas((prev) => [...prev, { titulo: '', turno: 'todos' }])
  }

  function removeTarefa(i: number) {
    setTarefas((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateTarefa(i: number, field: keyof TarefaInput, value: string) {
    setTarefas((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function addFuncionario() {
    setFuncionarios((prev) => [...prev, { nome: '' }])
  }

  function removeFuncionario(i: number) {
    setFuncionarios((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateFuncionario(i: number, value: string) {
    setFuncionarios((prev) => prev.map((f, idx) => idx === i ? { nome: value } : f))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const canProceed =
    step === 1 ? nome.trim().length > 0 : true

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Configuração inicial
          </p>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: i < step ? 'hsl(var(--foreground))' : 'hsl(var(--muted))',
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Passo {Math.min(step, TOTAL_STEPS)} de {TOTAL_STEPS}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-10 overflow-y-auto">
        <div className="max-w-xl mx-auto">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo ao TurnOn</h1>
                <p className="text-muted-foreground mt-2">
                  Vamos configurar sua empresa em menos de 2 minutos.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome-empresa">Nome da empresa</Label>
                <Input
                  id="nome-empresa"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Restaurante do João"
                  className="text-base"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Esse nome aparece para os seus funcionários no app de turno.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Horários dos turnos</h1>
                <p className="text-muted-foreground mt-2">
                  Defina o intervalo de cada turno. Você pode alterar isso depois em Configurações.
                </p>
              </div>
              <div className="space-y-5">
                {TURNO_CONFIGS.map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <p className="text-sm font-medium">{label}</p>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input
                          type="time"
                          value={horarios[`${key}_inicio` as keyof typeof horarios]}
                          onChange={(e) =>
                            setHorarios((h) => ({ ...h, [`${key}_inicio`]: e.target.value }))
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input
                          type="time"
                          value={horarios[`${key}_fim` as keyof typeof horarios]}
                          onChange={(e) =>
                            setHorarios((h) => ({ ...h, [`${key}_fim`]: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Tarefas recorrentes</h1>
                <p className="text-muted-foreground mt-2">
                  Adicione as tarefas que se repetem todo dia. Você pode pular e adicionar mais tarde.
                </p>
              </div>
              <div className="space-y-3">
                {tarefas.map((tarefa, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={tarefa.titulo}
                        onChange={(e) => updateTarefa(i, 'titulo', e.target.value)}
                        placeholder={`Ex: Limpar bancada ${i + 1}`}
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {TURNO_OPTIONS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => updateTarefa(i, 'turno', t)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              tarefa.turno === t
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-border text-muted-foreground hover:border-foreground/40'
                            }`}
                          >
                            {TURNO_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {tarefas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTarefa(i)}
                        className="mt-2 text-muted-foreground hover:text-red-500 text-lg leading-none transition-colors"
                        aria-label="Remover tarefa"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTarefa}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <span className="text-base leading-none">+</span> Adicionar tarefa
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Adicionar funcionários</h1>
                <p className="text-muted-foreground mt-2">
                  Cada funcionário recebe um link único para marcar tarefas no turno. Você pode pular e adicionar depois.
                </p>
              </div>
              <div className="space-y-3">
                {funcionarios.map((func, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={func.nome}
                      onChange={(e) => updateFuncionario(i, e.target.value)}
                      placeholder={`Ex: Maria Silva`}
                      className="flex-1"
                    />
                    {funcionarios.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFuncionario(i)}
                        className="text-muted-foreground hover:text-red-500 text-lg leading-none transition-colors"
                        aria-label="Remover funcionário"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFuncionario}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <span className="text-base leading-none">+</span> Adicionar funcionário
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-foreground flex items-center justify-center">
                  <svg width="36" height="30" viewBox="0 0 36 30" fill="none">
                    <path
                      d="M3 15L13.5 25.5L33 4.5"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Tudo pronto!</h1>
                <p className="text-muted-foreground">
                  Sua empresa está configurada e pronta para uso.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                {savedTarefas > 0 && (
                  <div className="border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold">{savedTarefas}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {savedTarefas === 1 ? 'Tarefa criada' : 'Tarefas criadas'}
                    </p>
                  </div>
                )}
                {savedFuncs > 0 && (
                  <div className="border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold">{savedFuncs}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {savedFuncs === 1 ? 'Funcionário adicionado' : 'Funcionários adicionados'}
                    </p>
                  </div>
                )}
              </div>
              <Button
                size="lg"
                className="w-full max-w-xs"
                onClick={() => router.replace('/dashboard')}
              >
                Ir para o painel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {step < 5 && (
        <div className="border-t border-border px-4 py-4 bg-background">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1 || saving}
            >
              Voltar
            </Button>

            <div className="flex gap-2">
              {step >= 3 && (
                <Button
                  variant="outline"
                  onClick={step === 3 ? () => setStep(4) : finish}
                  disabled={saving}
                >
                  Pular
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed || saving}
              >
                {saving ? 'Salvando...' : step === 4 ? 'Concluir' : 'Próximo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
