-- Oferta por volumen sobre el precio mayorista (catálogo B2B)
ALTER TABLE products ADD COLUMN IF NOT EXISTS mayorista_descuento_tipo TEXT
  CHECK (mayorista_descuento_tipo IN ('porcentaje', 'monto'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS mayorista_descuento_valor DECIMAL(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS mayorista_descuento_desde_cantidad INTEGER;

SELECT 'products.mayorista_descuento_*' AS check, count(*) FROM products;
