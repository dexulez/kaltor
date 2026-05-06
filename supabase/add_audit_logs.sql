-- ============================================================
-- MIGRACIÓN: Tabla de auditoría + columna de insumos promedio
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabla de log de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  usuario_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nombre TEXT      NOT NULL DEFAULT '',
  accion       TEXT        NOT NULL,
  modulo       TEXT        NOT NULL,
  entidad_id   TEXT,
  entidad_desc TEXT,
  valor_anterior JSONB,
  valor_nuevo    JSONB,
  metadata       JSONB      DEFAULT '{}'
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_usuario  ON audit_logs (usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_modulo   ON audit_logs (modulo);
CREATE INDEX IF NOT EXISTS idx_audit_accion   ON audit_logs (accion);

-- RLS: solo administradores pueden leer, cualquier usuario autenticado puede insertar
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_admin" ON audit_logs;
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "audit_insert_all" ON audit_logs;
CREATE POLICY "audit_insert_all" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Agregar costo promedio de insumos a system_config
--    (usado para calcular rentabilidad neta por reparación)
ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS costo_insumos_promedio INTEGER DEFAULT 0;

-- Descripción: Costo promedio de insumos de taller (soldadura, flux, etc.)
-- que se descuenta de cada reparación para calcular la ganancia neta real.

-- Verificación
SELECT 'audit_logs' as tabla, COUNT(*) as registros FROM audit_logs;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'system_config' AND column_name = 'costo_insumos_promedio';
