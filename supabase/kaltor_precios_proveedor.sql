-- ============================================================
-- Lista de precios estructurada por proveedor (comparar antes de comprar)
-- Ejecutar en Supabase SQL Editor
--
-- Distinto de "lista_precios_url" en suppliers (que es solo un archivo
-- adjunto). Esta tabla guarda un precio por repuesto/producto y proveedor,
-- para poder comparar entre proveedores al crear una orden de compra.
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  nombre_repuesto TEXT NOT NULL,
  sku_proveedor TEXT,
  precio DECIMAL(12,2) NOT NULL CHECK (precio >= 0),
  disponible BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spp_store ON supplier_product_prices(store_id);
CREATE INDEX IF NOT EXISTS idx_spp_supplier ON supplier_product_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_spp_product ON supplier_product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_spp_nombre ON supplier_product_prices (lower(nombre_repuesto));

-- Evita duplicar el mismo producto de inventario dos veces para el mismo proveedor
CREATE UNIQUE INDEX IF NOT EXISTS uq_spp_supplier_product
  ON supplier_product_prices(supplier_id, product_id) WHERE product_id IS NOT NULL;

-- store_id automático en cada INSERT (mismo patrón que el resto de tablas Kaltor)
DROP TRIGGER IF EXISTS trig_store_id_supplier_product_prices ON supplier_product_prices;
CREATE TRIGGER trig_store_id_supplier_product_prices
  BEFORE INSERT ON supplier_product_prices
  FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

-- Aislamiento multi-tenant (mismo patrón kaltor_v1 del resto de tablas)
ALTER TABLE supplier_product_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kaltor_v1 ON supplier_product_prices;
CREATE POLICY kaltor_v1 ON supplier_product_prices
  FOR ALL TO authenticated
  USING (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'supplier_product_prices'
ORDER BY ordinal_position;
