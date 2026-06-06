-- Agregar campos de WhatsApp API a system_config
-- Ejecutar en Supabase SQL Editor

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS wa_url TEXT,
  ADD COLUMN IF NOT EXISTS wa_apikey TEXT,
  ADD COLUMN IF NOT EXISTS wa_instancia TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS wa_activo BOOLEAN DEFAULT FALSE;
