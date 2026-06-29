-- Seguimiento de entrega y pago para pedidos B2B (sales_orders)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS metodo_pago TEXT
  CHECK (metodo_pago IN ('efectivo', 'transferencia', 'debito', 'credito'));
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS pagado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS fecha_entregado TIMESTAMPTZ;

SELECT 'sales_orders.entrega_pago' AS check, count(*) FROM sales_orders;
