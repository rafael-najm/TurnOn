-- TurnOn — Schema SQL
-- Execute este arquivo no SQL Editor do Supabase

CREATE TABLE empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  token text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  turno text CHECK (turno IN ('manha', 'tarde', 'noite', 'todos')),
  recorrente boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  funcionario_id uuid REFERENCES funcionarios(id) ON DELETE CASCADE,
  feito_em timestamptz DEFAULT now(),
  data_turno date DEFAULT current_date
);

-- Enable Row Level Security
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE execucoes ENABLE ROW LEVEL SECURITY;

-- Policies: owners manage their own data

-- empresas: owner sees/modifies only their own
CREATE POLICY "owner_select_empresa" ON empresas
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_empresa" ON empresas
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_empresa" ON empresas
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_empresa" ON empresas
  FOR DELETE USING (auth.uid() = owner_id);

-- funcionarios: owner of the empresa manages
CREATE POLICY "owner_all_funcionarios" ON funcionarios
  FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE owner_id = auth.uid())
  );

-- funcionarios: allow anonymous/token-based read (for /turno/[token] route)
CREATE POLICY "public_read_funcionarios_by_token" ON funcionarios
  FOR SELECT USING (true);

-- tarefas: owner of the empresa manages
CREATE POLICY "owner_all_tarefas" ON tarefas
  FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE owner_id = auth.uid())
  );

-- tarefas: allow public read (employee route reads tasks without auth)
CREATE POLICY "public_read_tarefas" ON tarefas
  FOR SELECT USING (true);

-- execucoes: public insert (employee checks off tasks without auth)
CREATE POLICY "public_insert_execucoes" ON execucoes
  FOR INSERT WITH CHECK (true);

-- execucoes: public read (dashboard and employee page read executions)
CREATE POLICY "public_read_execucoes" ON execucoes
  FOR SELECT USING (true);

-- execucoes: owner can delete (for cleanup)
CREATE POLICY "owner_delete_execucoes" ON execucoes
  FOR DELETE USING (
    tarefa_id IN (
      SELECT t.id FROM tarefas t
      JOIN empresas e ON e.id = t.empresa_id
      WHERE e.owner_id = auth.uid()
    )
  );

-- Enable realtime for execucoes table
-- Run in Supabase dashboard: Realtime > Tables > enable execucoes
