-- Nota interna del staff sobre un pedido B2B (ej: observaciones sobre el
-- comprobante de pago, aclaraciones internas, etc). No la ve el comprador.
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS notas_internas TEXT;
