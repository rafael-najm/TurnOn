'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from '@/components/logout-button'

const NAV_ITEMS = [
  { label: 'Painel', href: '/dashboard' },
  { label: 'Escala', href: '/escala' },
  { label: 'Tarefas', href: '/tarefas' },
  { label: 'Equipe', href: '/equipe' },
  { label: 'Config', href: '/configuracoes' },
]

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-base">TurnOn</span>
            <nav className="flex items-center gap-1 text-sm">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      isActive
                        ? 'bg-foreground text-background font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
