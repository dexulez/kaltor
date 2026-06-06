-- Agrega columna de código de barras EAN-13 / Code128 a productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS codigo_barras TEXT;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(codigo_barras) WHERE codigo_barras IS NOT NULL;
