-- Campos para que el proveedor cotice precio, agregue notas y sugiera alternativas
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS precio_cotizado INTEGER,
  ADD COLUMN IF NOT EXISTS nota_proveedor TEXT,
  ADD COLUMN IF NOT EXISTS alternativa TEXT,
  ADD COLUMN IF NOT EXISTS cantidad_disponible_proveedor INTEGER,
  ADD COLUMN IF NOT EXISTS precio_alternativa INTEGER,
  ADD COLUMN IF NOT EXISTS cantidad_alternativa INTEGER;
