-- TurnOn — Ecosystem Migration
-- Adds grupos, escalas, andamentos tables and updates empresas/funcionarios

-- 1. Add horario_* columns to empresas
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS horario_manha_inicio TEXT DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS horario_manha_fim    TEXT DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS horario_tarde_inicio TEXT DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS horario_tarde_fim    TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS horario_noite_inicio TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS horario_noite_fim    TEXT DEFAULT '06:00';

-- 2. Create grupos table
CREATE TABLE IF NOT EXISTS grupos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  cor        text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- 3. Create escalas table
CREATE TABLE IF NOT EXISTS escalas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    uuid REFERENCES empresas(id) ON DELETE CASCADE,
  funcionario_id uuid REFERENCES funcionarios(id) ON DELETE CASCADE,
  turno         text CHECK (turno IN ('manha', 'tarde', 'noite')),
  data          date NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (funcionario_id, data, turno)
);

-- 4. Create andamentos table
CREATE TABLE IF NOT EXISTS andamentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id     uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  funcionario_id uuid REFERENCES funcionarios(id) ON DELETE CASCADE,
  data_turno    date NOT NULL,
  iniciado_em   timestamptz DEFAULT now(),
  UNIQUE (tarefa_id, data_turno)
);

-- 5. Add grupo_id to funcionarios
ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES grupos(id) ON DELETE SET NULL;

-- 6. Enable RLS on new tables
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE andamentos ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for grupos (owner_all)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grupos' AND policyname = 'owner_all_grupos'
  ) THEN
    CREATE POLICY "owner_all_grupos" ON grupos
      FOR ALL USING (
        empresa_id IN (SELECT id FROM empresas WHERE owner_id = auth.uid())
      );
  END IF;
END $$;

-- 8. RLS policies for escalas (owner_all + public_read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'escalas' AND policyname = 'owner_all_escalas'
  ) THEN
    CREATE POLICY "owner_all_escalas" ON escalas
      FOR ALL USING (
        empresa_id IN (SELECT id FROM empresas WHERE owner_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'escalas' AND policyname = 'public_read_escalas'
  ) THEN
    CREATE POLICY "public_read_escalas" ON escalas
      FOR SELECT USING (true);
  END IF;
END $$;

-- 9. RLS policies for andamentos (public_insert, public_read, public_delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'andamentos' AND policyname = 'public_insert_andamentos'
  ) THEN
    CREATE POLICY "public_insert_andamentos" ON andamentos
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'andamentos' AND policyname = 'public_read_andamentos'
  ) THEN
    CREATE POLICY "public_read_andamentos" ON andamentos
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'andamentos' AND policyname = 'public_delete_andamentos'
  ) THEN
    CREATE POLICY "public_delete_andamentos" ON andamentos
      FOR DELETE USING (true);
  END IF;
END $$;
