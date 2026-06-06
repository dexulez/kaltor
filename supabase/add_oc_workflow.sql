-- =====================================================
-- OC Workflow: nuevos estados, campos y tabla de pagos
-- =====================================================

-- Nuevos campos en purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS plazo_pago_dias INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_pago DATE,
  ADD COLUMN IF NOT EXISTS monto_total_confirmado INTEGER,
  ADD COLUMN IF NOT EXISTS monto_pagado INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_respuesta_proveedor TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_admin TIMESTAMPTZ;

-- Nuevos campos en purchase_order_items (respuesta del admin)
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS aceptado_admin BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS cantidad_aceptada INTEGER,
  ADD COLUMN IF NOT EXISTS precio_aceptado INTEGER;

-- Tabla de pagos por orden de compra (historial parcial/total)
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  monto INTEGER NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'purchase_order_payments'
      AND policyname = 'authenticated can manage oc payments'
  ) THEN
    CREATE POLICY "authenticated can manage oc payments"
      ON purchase_order_payments FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Los nuevos estados del flujo son TEXT libre, no necesitan migración de enum.
-- Estados nuevos: 'enviada', 'proveedor_respondio', 'confirmada'
-- Orden completo: pendiente → enviada → proveedor_respondio → confirmada → en_transito → recibida_parcial/completa
