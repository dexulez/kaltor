-- Configuración del asistente de IA (activar/desactivar y lado por defecto)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS asistente_ia_activo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS asistente_ia_posicion TEXT DEFAULT 'derecha';
