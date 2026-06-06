-- El CHECK constraint original solo incluía: pendiente, en_transito, recibida_parcial, recibida_completa, cancelada
-- Los estados del flujo (enviada, proveedor_respondio, confirmada) nunca se agregaron.
-- Este script corrige el constraint para incluir todos los estados del workflow.

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_estado_check;

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_estado_check
  CHECK (estado IN (
    'pendiente',
    'enviada',
    'proveedor_respondio',
    'confirmada',
    'en_transito',
    'recibida_parcial',
    'recibida_completa',
    'cancelada'
  ));
