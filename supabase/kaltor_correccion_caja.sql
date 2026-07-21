-- ============================================================
-- Corrección de caja / registro de venta de un día anterior
-- Ejecutar en Supabase Dashboard > SQL Editor > New query > Paste > Run
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS correcciones_caja (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sesion_id          UUID NOT NULL REFERENCES sesiones_caja(id) ON DELETE CASCADE,
  tipo               TEXT NOT NULL CHECK (tipo IN ('apertura_retroactiva', 'edicion_cierre')),
  motivo             TEXT NOT NULL,
  valores_anteriores JSONB,
  valores_nuevos     JSONB NOT NULL,
  venta_ids          UUID[],
  usuario_id         UUID REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correcciones_caja_sesion ON correcciones_caja(sesion_id);
CREATE INDEX IF NOT EXISTS idx_correcciones_caja_store  ON correcciones_caja(store_id);

-- Mismo patrón de aislamiento multi-tenant que el resto de tablas de datos
-- (ver supabase/kaltor_phase1_c_rls.sql): una sola política por store_id.
ALTER TABLE correcciones_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kaltor_v1" ON correcciones_caja;
CREATE POLICY "kaltor_v1" ON correcciones_caja
  FOR ALL TO authenticated
  USING (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

COMMIT;
