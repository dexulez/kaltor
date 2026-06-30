-- Permite que el comprador reporte un abono parcial (no solo el pago total)
-- al confirmar un pedido B2B, tanto individual como en selección múltiple.
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS monto_reportado INTEGER;
