-- Gastos fijos del local (arriendo, servicios, contaduría, etc.)
CREATE TABLE IF NOT EXISTS gastos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'operacional',
  monto INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Empleados del taller con datos para cálculo de costos laborales
CREATE TABLE IF NOT EXISTS empleados_taller (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cargo TEXT,
  sueldo_base INTEGER NOT NULL DEFAULT 0,
  tasa_afp DECIMAL(5,2) DEFAULT 10.58,
  tasa_salud DECIMAL(5,2) DEFAULT 7.0,
  tiene_comision BOOLEAN DEFAULT false,
  comision_pct DECIMAL(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE gastos_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_taller ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gastos_fijos_all" ON gastos_fijos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "empleados_taller_all" ON empleados_taller
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
