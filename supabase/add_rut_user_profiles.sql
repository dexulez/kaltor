-- Agrega columna rut a user_profiles si no existe
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS rut TEXT;

-- Recarga el schema cache de PostgREST para que reconozca la nueva columna
NOTIFY pgrst, 'reload schema';
