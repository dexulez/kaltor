-- Pagado/por pagar para OCs que no son a crédito (efectivo/transferencia/débito).
-- El crédito ya se rastrea con monto_pagado + purchase_order_payments; esto es
-- para el caso simple: pagué de una vez o todavía no.
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS pagado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
