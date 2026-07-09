-- ============================================================
-- Unidad de medida en productos + cantidades decimales
-- Permite vender/comprar por kg, litro, metro, etc. (no solo unidad)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1. Unidad de medida del producto
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unidad_medida TEXT NOT NULL DEFAULT 'unidad';

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_unidad_medida_check;

ALTER TABLE products
  ADD CONSTRAINT products_unidad_medida_check
  CHECK (unidad_medida IN ('unidad', 'kg', 'g', 'litro', 'ml', 'metro', 'cm', 'caja'));

-- 2. Cantidades a NUMERIC(12,3) para permitir decimales (ej: 1.5 kg, 2.25 m)
ALTER TABLE products
  ALTER COLUMN stock_actual TYPE NUMERIC(12,3),
  ALTER COLUMN stock_minimo TYPE NUMERIC(12,3);

ALTER TABLE stock_movements
  ALTER COLUMN cantidad TYPE NUMERIC(12,3),
  ALTER COLUMN stock_anterior TYPE NUMERIC(12,3),
  ALTER COLUMN stock_nuevo TYPE NUMERIC(12,3);

ALTER TABLE sale_items
  ALTER COLUMN cantidad TYPE NUMERIC(12,3);

ALTER TABLE purchase_order_items
  ALTER COLUMN cantidad_solicitada TYPE NUMERIC(12,3),
  ALTER COLUMN cantidad_recibida TYPE NUMERIC(12,3);

ALTER TABLE repair_items
  ALTER COLUMN cantidad TYPE NUMERIC(12,3);

COMMIT;

-- Verificación
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE (table_name = 'products' AND column_name IN ('unidad_medida', 'stock_actual', 'stock_minimo'))
   OR (table_name = 'stock_movements' AND column_name IN ('cantidad', 'stock_anterior', 'stock_nuevo'))
   OR (table_name = 'sale_items' AND column_name = 'cantidad')
   OR (table_name = 'purchase_order_items' AND column_name IN ('cantidad_solicitada', 'cantidad_recibida'))
   OR (table_name = 'repair_items' AND column_name = 'cantidad')
ORDER BY table_name, column_name;
