-- ============================================================
-- Comprobantes de pago en Órdenes de Compra
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna a purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS comprobante_pago_urls text[] DEFAULT '{}';

-- 2. Crear bucket de Storage (solo funciona desde el SQL Editor de Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes-pago', 'comprobantes-pago', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage

-- Usuarios autenticados pueden subir archivos
DROP POLICY IF EXISTS "Authenticated upload comprobantes" ON storage.objects;
CREATE POLICY "Authenticated upload comprobantes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comprobantes-pago');

-- Cualquiera puede ver (URLs públicas para links en historial)
DROP POLICY IF EXISTS "Public view comprobantes" ON storage.objects;
CREATE POLICY "Public view comprobantes"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'comprobantes-pago');

-- Usuarios autenticados pueden eliminar sus propios archivos
DROP POLICY IF EXISTS "Authenticated delete comprobantes" ON storage.objects;
CREATE POLICY "Authenticated delete comprobantes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'comprobantes-pago');
