-- ============================================================
-- Límite de 2 dispositivos por usuario (1 móvil/tablet + 1 computador)
-- Ejecutar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS user_active_sessions (
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_dispositivo TEXT        NOT NULL CHECK (tipo_dispositivo IN ('movil', 'computador')),
  session_token    UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_agent       TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tipo_dispositivo)
);

COMMIT;

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_active_sessions';
