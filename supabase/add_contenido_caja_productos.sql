-- ============================================================
-- Contenido de la caja: cuando unidad_medida = 'caja', permite indicar
-- cuánto contiene esa caja (ej: 1 caja = 12 unidades, o 1 caja = 5 litros)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS contenido_por_caja NUMERIC(12,3);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS contenido_unidad_medida TEXT;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_contenido_unidad_medida_check;

ALTER TABLE products
  ADD CONSTRAINT products_contenido_unidad_medida_check
  CHECK (contenido_unidad_medida IS NULL OR contenido_unidad_medida IN ('unidad', 'kg', 'g', 'litro', 'ml', 'metro', 'cm'));

COMMIT;

-- Verificación
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('contenido_por_caja', 'contenido_unidad_medida')
ORDER BY column_name;
