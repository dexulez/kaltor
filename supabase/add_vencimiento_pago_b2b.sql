-- ============================================================
-- Plazo y vencimiento de pago para pedidos B2B
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS plazo_pago_dias INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_pago DATE,
  ADD COLUMN IF NOT EXISTS recordatorio_enviado_at TIMESTAMPTZ;
