# TurnOn

Ferramenta de gestão de tarefas por turno para pequenas empresas brasileiras.

## Stack

- Next.js 14 (App Router)
- Supabase (auth, banco de dados, realtime)
- Tailwind CSS + shadcn/ui
- qrcode.react

## Configuração

1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.local.example .env.local
   ```
   Preencha com as chaves do seu projeto Supabase.

2. Execute o schema no SQL Editor do Supabase:
   ```
   supabase/schema.sql
   ```

3. No painel do Supabase, vá em **Realtime → Tables** e ative a tabela `execucoes`.

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Páginas

| Rota | Descrição |
|------|-----------|
| `/login` | Login / cadastro do dono da empresa |
| `/dashboard` | Painel realtime com progresso das tarefas por turno |
| `/tarefas` | CRUD de tarefas recorrentes, filtrável por turno |
| `/equipe` | Gestão de funcionários com links únicos e QR codes |
| `/turno/[token]` | Tela do funcionário (sem login) — marca tarefas do turno atual |

## Turnos

A detecção de turno é feita automaticamente pelo horário:

- **Manhã**: 06h – 12h
- **Tarde**: 12h – 18h
- **Noite**: 18h – 06h

As tarefas se resetam a cada dia (por `data_turno`).
