-- Módulo de Contabilidad: IVA/PPM mensual (F29), pagos previsionales de empleados,
-- y otras obligaciones tributarias. Mismo patrón de RLS que empleados_taller/gastos_fijos
-- (USING(true) para authenticated; el control de acceso real es el módulo en el frontend).

-- Pagos previsionales mensuales por empleado (sueldo/AFP/salud)
CREATE TABLE IF NOT EXISTS pagos_previsionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados_taller(id) ON DELETE CASCADE,
  mes DATE NOT NULL,                  -- día 1 del mes correspondiente
  sueldo_pagado INTEGER DEFAULT 0,
  afp_pagado INTEGER DEFAULT 0,
  salud_pagado INTEGER DEFAULT 0,
  fecha_pago DATE,
  comprobante_url TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',  -- 'pendiente' | 'pagado'
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empleado_id, mes)
);

-- Declaración mensual F29 (IVA + PPM)
CREATE TABLE IF NOT EXISTS declaraciones_f29 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes DATE NOT NULL UNIQUE,           -- día 1 del mes correspondiente
  iva_credito INTEGER NOT NULL DEFAULT 0,   -- IVA crédito fiscal (compras con factura), ingresado manualmente
  tasa_ppm DECIMAL(5,2) NOT NULL DEFAULT 3,  -- % de PPM, editable antes de cada pago
  fecha_vencimiento DATE,
  fecha_pago DATE,
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Por si la tabla ya existía antes de agregar tasa_ppm
ALTER TABLE declaraciones_f29 ADD COLUMN IF NOT EXISTS tasa_ppm DECIMAL(5,2) NOT NULL DEFAULT 3;

-- Otras obligaciones tributarias (patente municipal, renta anual, contribuciones, etc.)
CREATE TABLE IF NOT EXISTS obligaciones_tributarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  monto INTEGER NOT NULL DEFAULT 0,
  fecha_vencimiento DATE,
  recurrencia TEXT NOT NULL DEFAULT 'unica',  -- 'unica' | 'mensual' | 'anual'
  fecha_pago DATE,
  comprobante_url TEXT,
  notas TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagos_previsionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE declaraciones_f29 ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligaciones_tributarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagos_previsionales_all" ON pagos_previsionales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "declaraciones_f29_all" ON declaraciones_f29
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "obligaciones_tributarias_all" ON obligaciones_tributarias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
