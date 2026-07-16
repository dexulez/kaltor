-- ============================================================
-- Métricas de acceso de usuarios (veces que entraron al sistema)
-- Ejecutar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS user_login_events (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id         UUID REFERENCES stores(id) ON DELETE CASCADE,
  tipo_dispositivo TEXT,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_login_events_store ON user_login_events (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_events_user  ON user_login_events (user_id, created_at DESC);

-- RLS: solo administradores leen (de su propia tienda, filtrado en la app);
-- el registro de cada login lo hace el servidor con service role.
ALTER TABLE user_login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_events_select_admin" ON user_login_events;
CREATE POLICY "login_events_select_admin" ON user_login_events FOR SELECT TO authenticated
  USING (is_admin());

COMMIT;

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_login_events';
