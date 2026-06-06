-- Agregar columna fecha_estimada_entrega a repair_orders
-- Esta columna guarda la fecha prometida de entrega al cliente
ALTER TABLE repair_orders
ADD COLUMN IF NOT EXISTS fecha_estimada_entrega DATE;
