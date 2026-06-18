-- Selector global para forzar mayúsculas automáticas en los campos de texto del sistema
-- Ejecutar en Supabase SQL Editor

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS mayusculas_automaticas BOOLEAN DEFAULT FALSE;
