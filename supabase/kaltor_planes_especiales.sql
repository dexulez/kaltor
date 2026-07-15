-- ============================================================
-- KALTOR PLANES ESPECIALES: precio personalizado por cliente
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

BEGIN;

-- ── 1. Columnas de plan especial en plans ───────────────────────────────────
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS es_especial        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_especial_id  UUID REFERENCES stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS flow_plan_id       TEXT,
  ADD COLUMN IF NOT EXISTS paypal_plan_id     TEXT;

-- Un plan especial pertenece a una sola tienda (1:1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_store_especial
  ON plans(store_especial_id) WHERE store_especial_id IS NOT NULL;

COMMIT;

-- Verificar
SELECT id, nombre, slug, precio_mensual, precio_mensual_usd, es_especial,
       store_especial_id, flow_plan_id, paypal_plan_id
FROM plans
WHERE es_especial = true;
