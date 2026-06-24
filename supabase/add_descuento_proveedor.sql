-- Permite que el proveedor indique un descuento por ítem (monto o %),
-- aplicable a todo el ítem o solo si la cantidad disponible alcanza un mínimo
-- (descuento por volumen). El precio_cotizado ya guarda el precio unitario
-- final (con el descuento ya aplicado); estas columnas son para mostrar el
-- detalle del descuento, no para recalcularlo.
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS descuento_tipo TEXT;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS descuento_valor NUMERIC;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS descuento_desde_cantidad INTEGER;
