-- Etapas de despacho, pagos parciales y cancelacion para Pedidos B2B
-- (espejo del flujo de Compras, en sentido inverso)

ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_estado_check;
ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_estado_check
  CHECK (estado IN ('pendiente','confirmado','preparando','en_camino','entregado','rechazado','cancelado'));

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS comprobante_envio_url TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS comprobante_pago_urls TEXT[] DEFAULT '{}';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS monto_pagado INTEGER DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES auth.users(id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelado_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

UPDATE sales_orders SET monto_pagado = total_estimado WHERE pagado = true AND monto_pagado = 0;

ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS agregado_por_staff BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS sales_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  monto INTEGER NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales_order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver pagos b2b" ON sales_order_payments;
CREATE POLICY "ver pagos b2b" ON sales_order_payments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "gestionar pagos b2b" ON sales_order_payments;
CREATE POLICY "gestionar pagos b2b" ON sales_order_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
