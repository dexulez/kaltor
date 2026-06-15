-- ============================================================
-- TABLAS DE SESIÓN Y CIERRE DE CAJA
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Tabla principal de sesiones de caja ─────────────────
CREATE TABLE IF NOT EXISTS sesiones_caja (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha                DATE        NOT NULL,
  estado               TEXT        NOT NULL DEFAULT 'abierta'
                         CHECK (estado IN ('abierta', 'cerrada')),
  efectivo_apertura    NUMERIC     NOT NULL DEFAULT 0,
  apertura_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  efectivo_cierre      NUMERIC,
  transbank_cierre     NUMERIC,
  transferencia_cierre NUMERIC,
  otros_cierre         NUMERIC,
  diferencia_efectivo  NUMERIC,
  cuentas_transferencia UUID[],
  observaciones_cierre TEXT,
  cierre_at            TIMESTAMPTZ,
  usuario_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_cierre_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- En caso de que la tabla ya exista pero le falten columnas:
ALTER TABLE sesiones_caja ADD COLUMN IF NOT EXISTS cuentas_transferencia    UUID[];
ALTER TABLE sesiones_caja ADD COLUMN IF NOT EXISTS usuario_cierre_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE sesiones_caja ADD COLUMN IF NOT EXISTS otros_cierre             NUMERIC;
ALTER TABLE sesiones_caja ADD COLUMN IF NOT EXISTS diferencia_efectivo      NUMERIC;
ALTER TABLE sesiones_caja ADD COLUMN IF NOT EXISTS observaciones_cierre     TEXT;
ALTER TABLE sesiones_caja ADD COLUMN IF NOT EXISTS cierre_at                TIMESTAMPTZ;

-- Índices
CREATE INDEX IF NOT EXISTS idx_sesiones_caja_estado   ON sesiones_caja (estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_caja_fecha    ON sesiones_caja (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_sesiones_caja_creada   ON sesiones_caja (created_at DESC);

-- ── 2. Tabla de arqueos intermedios ────────────────────────
CREATE TABLE IF NOT EXISTS arqueos_caja (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id      UUID        NOT NULL REFERENCES sesiones_caja(id) ON DELETE CASCADE,
  efectivo       NUMERIC     NOT NULL DEFAULT 0,
  transbank      NUMERIC     NOT NULL DEFAULT 0,
  transferencia  NUMERIC     NOT NULL DEFAULT 0,
  observaciones  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arqueos_caja_sesion ON arqueos_caja (sesion_id);

-- ── 3. RLS — acceso para administrador, vendedor y supervisor ──
ALTER TABLE sesiones_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos_caja  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sesiones_caja_all" ON sesiones_caja;
CREATE POLICY "sesiones_caja_all" ON sesiones_caja
  FOR ALL TO authenticated
  USING  (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'))
  WITH CHECK (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));

DROP POLICY IF EXISTS "arqueos_caja_all" ON arqueos_caja;
CREATE POLICY "arqueos_caja_all" ON arqueos_caja
  FOR ALL TO authenticated
  USING  (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'))
  WITH CHECK (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));

-- ── 4. Verificación ────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sesiones_caja'
ORDER BY ordinal_position;
