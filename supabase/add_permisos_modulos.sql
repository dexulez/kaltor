-- ============================================================
-- MIGRACIÓN: Agregar permisos_modulos por usuario
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Agregar columna al perfil de usuario
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS permisos_modulos JSONB DEFAULT NULL;

-- Comentario: NULL significa "usar defaults del rol",
-- un objeto JSON con booleans significa permisos explícitos.
-- Ejemplo: '{"dashboard":true,"clientes":true,"reparaciones":false,...}'

-- 2. Asegurarse de que el admin pueda escribir permisos_modulos de otros usuarios
-- (ya cubierto por la política profiles_admin FOR ALL, pero lo documentamos)

-- 3. Verificar la columna
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'permisos_modulos';
