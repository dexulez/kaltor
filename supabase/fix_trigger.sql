-- ============================================================
-- FIX: Trigger handle_new_user + política INSERT faltante
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

-- 1. Agregar política INSERT que permite que el trigger cree perfiles
DROP POLICY IF EXISTS "profiles_insert" ON user_profiles;
CREATE POLICY "profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- 2. Recrear la función con search_path explícito (fix de Supabase)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id UUID;
  user_count INTEGER;
BEGIN
  SELECT id INTO admin_role_id
  FROM public.roles
  WHERE nombre = 'administrador'
  LIMIT 1;

  SELECT COUNT(*) INTO user_count FROM public.user_profiles;

  INSERT INTO public.user_profiles (id, nombre_completo, email, rol_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    NEW.email,
    CASE WHEN user_count = 0 THEN admin_role_id ELSE NULL END
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error en handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Verificar que el trigger existe (recrear si es necesario)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
