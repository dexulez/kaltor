-- ============================================================
-- Foto de producto en Inventario
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna a products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Crear bucket de Storage (solo funciona desde el SQL Editor de Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos-fotos', 'productos-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage

-- Usuarios autenticados pueden subir fotos
DROP POLICY IF EXISTS "Authenticated upload fotos producto" ON storage.objects;
CREATE POLICY "Authenticated upload fotos producto"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'productos-fotos');

-- Cualquiera puede ver (URLs públicas para mostrarlas en inventario y catálogo B2B)
DROP POLICY IF EXISTS "Public view fotos producto" ON storage.objects;
CREATE POLICY "Public view fotos producto"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'productos-fotos');

-- Usuarios autenticados pueden reemplazar/eliminar fotos
DROP POLICY IF EXISTS "Authenticated update fotos producto" ON storage.objects;
CREATE POLICY "Authenticated update fotos producto"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'productos-fotos');

DROP POLICY IF EXISTS "Authenticated delete fotos producto" ON storage.objects;
CREATE POLICY "Authenticated delete fotos producto"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'productos-fotos');
