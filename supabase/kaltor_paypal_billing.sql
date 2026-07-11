-- ============================================================
-- KALTOR PAYPAL BILLING: Columnas de facturación PayPal + tabla eventos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

BEGIN;

-- ── 1. Columnas de billing PayPal en stores ─────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider       TEXT
    CHECK (payment_provider IN ('flow','paypal'));

-- Índice para buscar por subscription_id en webhooks
CREATE INDEX IF NOT EXISTS idx_stores_paypal_sub ON stores(paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;

-- ── 2. Tabla de eventos PayPal (auditoría) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS paypal_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type      TEXT        NOT NULL,
  subscription_id TEXT,
  raw_payload     JSONB
);

-- Solo el service role puede insertar/leer (no exponer al cliente)
ALTER TABLE paypal_events ENABLE ROW LEVEL SECURITY;
-- Sin policy pública: solo el service_role (sin RLS) puede acceder

COMMIT;

-- Verificar
SELECT id, nombre, billing_status, payment_provider, flow_subscription_id, paypal_subscription_id
FROM stores
ORDER BY created_at DESC
LIMIT 10;
