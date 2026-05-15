-- Add onboarding_concluido to empresas
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS onboarding_concluido BOOLEAN DEFAULT FALSE;

-- Mark existing companies as already onboarded
UPDATE empresas SET onboarding_concluido = TRUE WHERE onboarding_concluido = FALSE;
