'use client'

import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { QRCodeSVG } from 'qrcode.react'
import { type Funcionario, type Grupo } from '@/lib/types'

type Props = {
  empresaId: string
}

const PRESET_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

function getTurnoLink(token: string): string {
  if (typeof window === 'undefined') return ''
  const base = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? '')
  return `${base}/turno/?token=${token}`
}

export default function EquipeClient({ empresaId }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])

  // Funcionario form
  const [nome, setNome] = useState('')
  const [loadingAdd, setLoadingAdd] = useState(false)
  const [addError, setAddError] = useState('')

  // Grupo form
  const [grupoNome, setGrupoNome] = useState('')
  const [grupoCor, setGrupoCor] = useState(PRESET_COLORS[0])
  const [loadingGrupo, setLoadingGrupo] = useState(false)

  const qrRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const supabase = createClient()

  useEffect(() => {
    const client = createClient()
    async function load() {
      const [{ data: funcs }, { data: grps }] = await Promise.all([
        client.from('funcionarios').select('*').eq('empresa_id', empresaId).order('created_at'),
        client.from('grupos').select('*').eq('empresa_id', empresaId).order('created_at'),
      ])
      setFuncionarios(funcs ?? [])
      setGrupos(grps ?? [])
    }
    load()
  }, [empresaId])

  async function handleAddFuncionario(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setLoadingAdd(true)
    setAddError('')

    const { data, error: err } = await supabase
      .from('funcionarios')
      .insert({ empresa_id: empresaId, nome: nome.trim() })
      .select()
      .single()

    if (err) {
      setAddError('Erro ao adicionar funcionário.')
    } else {
      setFuncionarios((prev) => [...prev, data])
      setNome('')
    }
    setLoadingAdd(false)
  }

  async function handleDeleteFuncionario(id: string) {
    const { error: err } = await supabase.from('funcionarios').delete().eq('id', id)
    if (!err) setFuncionarios((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleSetGrupo(funcionarioId: string, grupoId: string | null) {
    const { error } = await supabase
      .from('funcionarios')
      .update({ grupo_id: grupoId })
      .eq('id', funcionarioId)
    if (!error) {
      setFuncionarios((prev) =>
        prev.map((f) => (f.id === funcionarioId ? { ...f, grupo_id: grupoId } : f))
      )
    }
  }

  async function handleAddGrupo(e: React.FormEvent) {
    e.preventDefault()
    if (!grupoNome.trim()) return
    setLoadingGrupo(true)

    const { data, error } = await supabase
      .from('grupos')
      .insert({ empresa_id: empresaId, nome: grupoNome.trim(), cor: grupoCor })
      .select()
      .single()

    if (!error && data) {
      setGrupos((prev) => [...prev, data])
      setGrupoNome('')
      setGrupoCor(PRESET_COLORS[0])
    }
    setLoadingGrupo(false)
  }

  async function handleDeleteGrupo(id: string) {
    const { error } = await supabase.from('grupos').delete().eq('id', id)
    if (!error) {
      setGrupos((prev) => prev.filter((g) => g.id !== id))
      // Clear grupo_id on affected employees locally
      setFuncionarios((prev) =>
        prev.map((f) => (f.grupo_id === id ? { ...f, grupo_id: null } : f))
      )
    }
  }

  function downloadQR(funcionario: Funcionario) {
    const container = qrRefs.current[funcionario.id]
    if (!container) return
    const svg = container.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      const link = document.createElement('a')
      link.download = `qr-${funcionario.nome.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie grupos e funcionários
        </p>
      </div>

      {/* Grupos section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Grupos</h2>

        <form onSubmit={handleAddGrupo} className="flex gap-2 items-end flex-wrap">
          <div className="space-y-1.5 flex-1 min-w-40">
            <Label htmlFor="grupo-nome">Novo grupo</Label>
            <Input
              id="grupo-nome"
              value={grupoNome}
              onChange={(e) => setGrupoNome(e.target.value)}
              placeholder="Nome do grupo"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setGrupoCor(color)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: grupoCor === color ? '#000' : 'transparent',
                  }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={loadingGrupo}>
            {loadingGrupo ? '...' : 'Criar grupo'}
          </Button>
        </form>

        {grupos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: grupo.cor }}
                />
                <span className="text-sm font-medium">{grupo.nome}</span>
                <button
                  onClick={() => handleDeleteGrupo(grupo.id)}
                  className="text-muted-foreground hover:text-red-600 text-xs leading-none ml-1"
                  aria-label={`Remover grupo ${grupo.nome}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {grupos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
        )}
      </div>

      <Separator />

      {/* Funcionários section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Funcionários</h2>

        <form onSubmit={handleAddFuncionario} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="nome">Novo funcionário</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>
          <Button type="submit" disabled={loadingAdd}>
            {loadingAdd ? '...' : 'Adicionar'}
          </Button>
        </form>

        {addError && <p className="text-sm text-red-600">{addError}</p>}

        {funcionarios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum funcionário cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {funcionarios.map((func) => {
              const link = getTurnoLink(func.token)
              const grupoAtual = grupos.find((g) => g.id === func.grupo_id)
              return (
                <div key={func.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{func.nome}</p>
                        {grupoAtual && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: grupoAtual.cor }}
                          >
                            {grupoAtual.nome}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 break-all">{link}</p>

                      {grupos.length > 0 && (
                        <div className="mt-2">
                          <select
                            className="text-xs border border-border rounded px-2 py-1 bg-white"
                            value={func.grupo_id ?? ''}
                            onChange={(e) =>
                              handleSetGrupo(func.id, e.target.value || null)
                            }
                          >
                            <option value="">Sem grupo</option>
                            {grupos.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => navigator.clipboard.writeText(link)}
                          className="text-xs border border-border rounded px-2 py-1 hover:bg-muted transition-colors"
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={() => downloadQR(func)}
                          className="text-xs border border-border rounded px-2 py-1 hover:bg-muted transition-colors"
                        >
                          Baixar QR
                        </button>
                        <button
                          onClick={() => handleDeleteFuncionario(func.id)}
                          className="text-xs text-red-600 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                    <div
                      ref={(el) => {
                        qrRefs.current[func.id] = el
                      }}
                      className="flex-shrink-0"
                    >
                      {link && (
                        <QRCodeSVG
                          value={link}
                          size={96}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
