-- ============================================================
-- Patch: adaptar cuentas_bancarias existente + crear movimientos_bancarios
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Agregar columnas faltantes a la tabla existente
ALTER TABLE cuentas_bancarias
  ADD COLUMN IF NOT EXISTS nombre       TEXT,
  ADD COLUMN IF NOT EXISTS saldo_inicial INTEGER NOT NULL DEFAULT 0;

-- 2. Crear tabla de movimientos bancarios (para conciliación)
CREATE TABLE IF NOT EXISTS movimientos_bancarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cuenta_id   UUID NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  descripcion TEXT NOT NULL,
  monto       INTEGER NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('cargo', 'abono')),
  conciliado  BOOLEAN DEFAULT false,
  sale_id     UUID REFERENCES sales(id),
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE movimientos_bancarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store members can manage movimientos_bancarios"
  ON movimientos_bancarios FOR ALL
  USING (store_id IN (SELECT store_id FROM user_profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_mov_bancarios_store   ON movimientos_bancarios(store_id);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_cuenta  ON movimientos_bancarios(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_fecha   ON movimientos_bancarios(fecha DESC);

-- 3. Forzar recarga del schema cache
NOTIFY pgrst, 'reload schema';

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cuentas_bancarias'
ORDER BY ordinal_position;
