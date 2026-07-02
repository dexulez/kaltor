-- ============================================================
-- KALTOR FLOW BILLING: Columnas de facturación + tabla eventos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

BEGIN;

-- ── 1. Columnas de billing en stores ────────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS flow_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS flow_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_status       TEXT NOT NULL DEFAULT 'trial'
    CHECK (billing_status IN ('trial','pending','active','past_due','cancelled','suspended')),
  ADD COLUMN IF NOT EXISTS ultimo_pago_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proximo_cobro_at     TIMESTAMPTZ;

-- Índice para buscar por subscription_id en webhooks
CREATE INDEX IF NOT EXISTS idx_stores_flow_sub ON stores(flow_subscription_id)
  WHERE flow_subscription_id IS NOT NULL;

-- ── 2. Tabla de eventos Flow (auditoría) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS flow_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  event           TEXT        NOT NULL,
  subscription_id TEXT,
  status          INT,
  raw_payload     JSONB
);

-- Solo el service role puede insertar/leer (no exponer al cliente)
ALTER TABLE flow_events ENABLE ROW LEVEL SECURITY;
-- Sin policy pública: solo el service_role (sin RLS) puede acceder

-- ── 3. Función helper: ¿tiene la tienda acceso activo? ──────────────────────
CREATE OR REPLACE FUNCTION store_has_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_billing_status TEXT;
  v_trial_hasta    TIMESTAMPTZ;
BEGIN
  SELECT billing_status, trial_hasta
    INTO v_billing_status, v_trial_hasta
    FROM stores
   WHERE id = p_store_id;

  -- Trial vigente
  IF v_trial_hasta IS NOT NULL AND v_trial_hasta > now() THEN
    RETURN TRUE;
  END IF;

  -- Suscripción activa
  RETURN v_billing_status = 'active';
END;
$$;

COMMIT;

-- Verificar
SELECT id, nombre, billing_status, trial_hasta, flow_subscription_id
FROM stores
ORDER BY created_at DESC
LIMIT 10;
