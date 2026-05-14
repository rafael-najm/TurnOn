'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/hooks/use-empresa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const SHIFT_CONFIG = [
  { key: 'manha', label: 'Manhã', inicioField: 'horario_manha_inicio', fimField: 'horario_manha_fim' },
  { key: 'tarde', label: 'Tarde', inicioField: 'horario_tarde_inicio', fimField: 'horario_tarde_fim' },
  { key: 'noite', label: 'Noite', inicioField: 'horario_noite_inicio', fimField: 'horario_noite_fim' },
] as const

type FormState = {
  nome: string
  horario_manha_inicio: string
  horario_manha_fim: string
  horario_tarde_inicio: string
  horario_tarde_fim: string
  horario_noite_inicio: string
  horario_noite_fim: string
}

const DEFAULT_FORM: FormState = {
  nome: '',
  horario_manha_inicio: '06:00',
  horario_manha_fim: '12:00',
  horario_tarde_inicio: '12:00',
  horario_tarde_fim: '18:00',
  horario_noite_inicio: '18:00',
  horario_noite_fim: '06:00',
}

export default function ConfiguracoesPage() {
  const { empresa, loading: authLoading } = useEmpresa()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!empresa) return
    setForm({
      nome: empresa.nome ?? '',
      horario_manha_inicio: empresa.horario_manha_inicio ?? '06:00',
      horario_manha_fim: empresa.horario_manha_fim ?? '12:00',
      horario_tarde_inicio: empresa.horario_tarde_inicio ?? '12:00',
      horario_tarde_fim: empresa.horario_tarde_fim ?? '18:00',
      horario_noite_inicio: empresa.horario_noite_inicio ?? '18:00',
      horario_noite_fim: empresa.horario_noite_fim ?? '06:00',
    })
  }, [empresa])

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return
    setSaving(true)

    const supabase = createClient()
    await supabase
      .from('empresas')
      .update({
        nome: form.nome.trim(),
        horario_manha_inicio: form.horario_manha_inicio,
        horario_manha_fim: form.horario_manha_fim,
        horario_tarde_inicio: form.horario_tarde_inicio,
        horario_tarde_fim: form.horario_tarde_fim,
        horario_noite_inicio: form.horario_noite_inicio,
        horario_noite_fim: form.horario_noite_fim,
      })
      .eq('id', empresa.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (authLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ajuste os dados e horários da sua empresa</p>
      </div>

      <form onSubmit={handleSave} className="max-w-lg space-y-8">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Dados da empresa</h2>
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da empresa</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Nome da empresa"
              required
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Horários dos turnos</h2>
          <div className="space-y-4">
            {SHIFT_CONFIG.map(({ key, label, inicioField, fimField }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={form[inicioField]}
                    onChange={(e) => handleChange(inicioField, e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">às</span>
                  <Input
                    type="time"
                    value={form[fimField]}
                    onChange={(e) => handleChange(fimField, e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Salvo!</span>
          )}
        </div>
      </form>
    </div>
  )
}
