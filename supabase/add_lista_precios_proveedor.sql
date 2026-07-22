-- ============================================================
-- Lista de precios por proveedor
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas a suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS lista_precios_url TEXT,
  ADD COLUMN IF NOT EXISTS lista_precios_nombre TEXT,
  ADD COLUMN IF NOT EXISTS lista_precios_actualizado_at TIMESTAMPTZ;

-- 2. Crear bucket de Storage (solo funciona desde el SQL Editor de Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proveedores-listas', 'proveedores-listas', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage

-- Usuarios autenticados pueden subir listas de precios
DROP POLICY IF EXISTS "Authenticated upload lista precios proveedor" ON storage.objects;
CREATE POLICY "Authenticated upload lista precios proveedor"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proveedores-listas');

-- Cualquiera con el link puede ver/descargar (URLs públicas)
DROP POLICY IF EXISTS "Public view lista precios proveedor" ON storage.objects;
CREATE POLICY "Public view lista precios proveedor"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'proveedores-listas');

-- Usuarios autenticados pueden reemplazar/eliminar listas de precios
DROP POLICY IF EXISTS "Authenticated update lista precios proveedor" ON storage.objects;
CREATE POLICY "Authenticated update lista precios proveedor"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'proveedores-listas');

DROP POLICY IF EXISTS "Authenticated delete lista precios proveedor" ON storage.objects;
CREATE POLICY "Authenticated delete lista precios proveedor"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'proveedores-listas');
