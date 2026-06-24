-- Nuevo estado intermedio "preparando" entre "confirmada" y "en_transito":
-- el proveedor primero marca que empezó a preparar el pedido, y solo después
-- confirma el envío (con o sin comprobante).
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_estado_check;

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_estado_check
  CHECK (estado IN (
    'pendiente',
    'enviada',
    'proveedor_respondio',
    'confirmada',
    'preparando',
    'en_transito',
    'recibida_parcial',
    'recibida_completa',
    'cancelada'
  ));
