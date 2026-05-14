'use client'

import Link from 'next/link'
import LogoutButton from '@/components/logout-button'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-base">TurnOn</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Painel
              </Link>
              <Link href="/tarefas" className="text-muted-foreground hover:text-foreground transition-colors">
                Tarefas
              </Link>
              <Link href="/equipe" className="text-muted-foreground hover:text-foreground transition-colors">
                Equipe
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
