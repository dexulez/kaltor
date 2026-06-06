-- Gastos diarios o extras (no recurrentes)
CREATE TABLE IF NOT EXISTS gastos_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'extra',
  monto INTEGER NOT NULL DEFAULT 0,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gastos_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gastos_extras_all" ON gastos_extras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
