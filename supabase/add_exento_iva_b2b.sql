-- ============================================================
-- Permite marcar una venta/pedido B2B como exenta de IVA al confirmarla
-- (el total se cobra neto, sin el 19%). Decisión exclusiva del staff
-- al confirmar el pedido.
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS exento_iva BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS exento_iva BOOLEAN NOT NULL DEFAULT false;
