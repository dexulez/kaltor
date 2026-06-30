-- ============================================================
-- Permite al admin decidir si los compradores externos ven el
-- stock disponible en el catálogo B2B (/catalogo-b2b)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS mostrar_stock_b2b BOOLEAN NOT NULL DEFAULT true;
