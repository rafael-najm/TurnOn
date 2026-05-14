import { Suspense } from 'react'
import TurnoClient from './turno-client'

export default function TurnoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    }>
      <TurnoClient />
    </Suspense>
  )
}
