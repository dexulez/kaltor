-- Fecha del pago más reciente registrado para la OC (se actualiza cada vez
-- que se agrega un abono), para poder mostrarla en el listado sin tener que
-- consultar todo el historial de purchase_order_payments.
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
