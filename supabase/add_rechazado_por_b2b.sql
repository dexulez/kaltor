-- ============================================================
-- Quién rechazó un pedido B2B (antes se reutilizaba confirmado_por,
-- generando ambigüedad entre "confirmado" y "rechazado")
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS rechazado_por UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS rechazado_at TIMESTAMPTZ;
