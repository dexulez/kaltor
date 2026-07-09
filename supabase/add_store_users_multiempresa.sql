-- ============================================================
-- Multi-empresa: un usuario puede pertenecer a varias tiendas
-- user_profiles.store_id sigue existiendo y ahora representa
-- la "tienda activa" (la que ve el usuario en este momento).
-- store_users es la tabla de membresía (a qué tiendas pertenece).
-- No se modifica get_current_store_id() ni las políticas RLS
-- existentes (siguen leyendo user_profiles.store_id).
-- Ejecutar en Supabase SQL Editor, DESPUÉS de tener la tabla stores.
-- ============================================================

BEGIN;

-- 1. Tabla de membresía usuario <-> tienda
CREATE TABLE IF NOT EXISTS store_users (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rol_id     UUID REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_users_user ON store_users(user_id);
CREATE INDEX IF NOT EXISTS idx_store_users_store ON store_users(store_id);

-- 2. Backfill: una fila por cada usuario con store_id ya asignado
INSERT INTO store_users (user_id, store_id, rol_id)
SELECT id, store_id, rol_id
FROM user_profiles
WHERE store_id IS NOT NULL
ON CONFLICT (user_id, store_id) DO NOTHING;

-- 3. RLS de store_users: cada usuario solo ve sus propias membresías
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_users_propio" ON store_users;
CREATE POLICY "store_users_propio"
ON store_users FOR SELECT
USING (user_id = auth.uid());

COMMIT;

-- Verificación
SELECT up.email, s.nombre AS tienda_activa, COUNT(su.store_id) AS total_tiendas
FROM user_profiles up
LEFT JOIN stores s ON s.id = up.store_id
LEFT JOIN store_users su ON su.user_id = up.id
GROUP BY up.email, s.nombre
ORDER BY total_tiendas DESC;
