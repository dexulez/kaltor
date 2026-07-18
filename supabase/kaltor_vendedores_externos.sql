-- ============================================================
-- KALTOR VENDEDORES EXTERNOS: afiliados con comisión recurrente
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

BEGIN;

-- ── 1. Vendedores externos (afiliados), entidad global ──────────────────────
CREATE TABLE IF NOT EXISTS vendedores_externos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo         TEXT UNIQUE NOT NULL,
  nombre         TEXT NOT NULL,
  email          TEXT NOT NULL,
  telefono       TEXT,
  rut            TEXT,
  banco          TEXT,
  tipo_cuenta    TEXT,
  numero_cuenta  TEXT,
  titular_cuenta TEXT,
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente', 'activo', 'rechazado', 'suspendido')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprobado_at    TIMESTAMPTZ,
  aprobado_por   TEXT
);

-- ── 2. Historial de pagos estructurado (falta hoy; base del motor de comisiones) ──
CREATE TABLE IF NOT EXISTS pagos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES plans(id),
  monto         NUMERIC(12, 2) NOT NULL,
  moneda        TEXT NOT NULL CHECK (moneda IN ('CLP', 'USD')),
  proveedor     TEXT NOT NULL CHECK (proveedor IN ('flow', 'paypal')),
  proveedor_ref TEXT,
  numero_pago   INTEGER NOT NULL,
  pagado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, numero_pago)
);

-- ── 3. Comisiones generadas por cada pago que corresponde según el ciclo ────
CREATE TABLE IF NOT EXISTS comisiones_vendedor (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES vendedores_externos(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  pago_id     UUID NOT NULL UNIQUE REFERENCES pagos(id) ON DELETE CASCADE,
  monto       NUMERIC(12, 2) NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
  pagada_at   TIMESTAMPTZ,
  pagada_por  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. Config global de vendedores (fila única) ──────────────────────────────
CREATE TABLE IF NOT EXISTS config_vendedores (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tope_descuento_pct NUMERIC(5, 2) NOT NULL DEFAULT 15
);
INSERT INTO config_vendedores (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ── 5. Columnas nuevas en plans y stores ─────────────────────────────────────
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS comision_vendedor_monto NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS plan_base_id            UUID REFERENCES plans(id);

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS vendedor_id                       UUID REFERENCES vendedores_externos(id),
  ADD COLUMN IF NOT EXISTS descuento_vendedor_pct            NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS descuento_vendedor_monto          NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS descuento_vendedor_expira_en_pago INTEGER;

COMMIT;

-- Verificar
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('vendedores_externos', 'pagos', 'comisiones_vendedor', 'config_vendedores');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'plans' AND column_name IN ('comision_vendedor_monto', 'plan_base_id');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'stores' AND column_name LIKE 'vendedor_id' OR column_name LIKE 'descuento_vendedor%';
