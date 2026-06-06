-- Agrega columna para registrar descuento aplicado a la OT
ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0;
