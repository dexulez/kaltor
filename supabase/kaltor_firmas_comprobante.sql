-- ============================================================
-- Firma de ambas partes en el comprobante (Configuración → Términos y condiciones)
-- Ejecutar en Supabase SQL Editor
--
-- Agrega dos columnas a system_config para controlar si el comprobante de
-- recepción de OT (copia cliente + copia tienda) muestra los espacios de
-- firma, y si van junto a los datos del comprobante o junto a los T&C.
-- ============================================================

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS mostrar_firmas_comprobante BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS firmas_posicion TEXT NOT NULL DEFAULT 'frontal'
    CHECK (firmas_posicion IN ('frontal', 'terminos'));

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'system_config' AND column_name IN ('mostrar_firmas_comprobante', 'firmas_posicion');
