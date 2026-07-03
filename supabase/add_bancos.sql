-- ============================================================
-- Kaltor: Módulo Bancos — cuentas bancarias y conciliaciones
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Cuentas bancarias de la tienda
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  banco       TEXT NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'corriente',
  numero      TEXT,
  saldo_inicial INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cuentas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store members can manage cuentas_bancarias"
  ON cuentas_bancarias
  FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 2. Movimientos bancarios (extracto para conciliación)
CREATE TABLE IF NOT EXISTS movimientos_bancarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cuenta_id       UUID NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  descripcion     TEXT NOT NULL,
  monto           INTEGER NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('cargo', 'abono')),
  conciliado      BOOLEAN DEFAULT false,
  sale_id         UUID REFERENCES sales(id),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE movimientos_bancarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store members can manage movimientos_bancarios"
  ON movimientos_bancarios
  FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_store ON cuentas_bancarias(store_id);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_store ON movimientos_bancarios(store_id);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_cuenta ON movimientos_bancarios(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_fecha ON movimientos_bancarios(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_conciliado ON movimientos_bancarios(conciliado);

-- Verificar
SELECT 'cuentas_bancarias' AS tabla, COUNT(*) FROM cuentas_bancarias
UNION ALL
SELECT 'movimientos_bancarios', COUNT(*) FROM movimientos_bancarios;
