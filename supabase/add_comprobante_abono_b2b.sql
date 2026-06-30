-- Permite adjuntar una foto de comprobante a cada abono registrado por el
-- staff en un pedido B2B (Abonar a este pedido).
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE sales_order_payments
  ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
