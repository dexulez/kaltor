-- Columna para identificar ítems sugeridos por el proveedor (no solicitados por el taller)
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS sugerido_proveedor boolean DEFAULT false;
