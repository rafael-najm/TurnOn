import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const geist = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'TurnOn — Gestão de Turnos',
  description: 'Ferramenta de gestão de tarefas por turno para pequenas empresas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
