'use client'

import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { QRCodeSVG } from 'qrcode.react'
import { type Funcionario } from '@/lib/types'

type Props = {
  empresaId: string
  initialFuncionarios: Funcionario[]
}

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin + (window.location.pathname.startsWith('/TurnOn') ? '/TurnOn' : '')
  return ''
}

export default function EquipeClient({ empresaId, initialFuncionarios }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(initialFuncionarios)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('funcionarios').select('*').eq('empresa_id', empresaId).order('created_at')
      .then(({ data }) => { if (data) setFuncionarios(data) })
  }, [empresaId])
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const qrRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const supabase = createClient()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('funcionarios')
      .insert({ empresa_id: empresaId, nome: nome.trim() })
      .select()
      .single()

    if (err) {
      setError('Erro ao adicionar funcionário.')
    } else {
      setFuncionarios((prev) => [...prev, data])
      setNome('')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error: err } = await supabase.from('funcionarios').delete().eq('id', id)
    if (!err) setFuncionarios((prev) => prev.filter((f) => f.id !== id))
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

  const baseUrl = getBaseUrl()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie os funcionários e seus links de acesso</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 items-end">
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
        <Button type="submit" disabled={loading}>
          {loading ? '...' : 'Adicionar'}
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Separator />

      {funcionarios.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum funcionário cadastrado ainda.
        </p>
      ) : (
        <div className="space-y-4">
          {funcionarios.map((func) => {
            const link = `${baseUrl}/turno/?token=${func.token}`
            return (
              <div key={func.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{func.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1 break-all">{link}</p>
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
                        onClick={() => handleDelete(func.id)}
                        className="text-xs text-red-600 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <div
                    ref={(el) => { qrRefs.current[func.id] = el }}
                    className="flex-shrink-0"
                  >
                    <QRCodeSVG
                      value={link}
                      size={96}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
