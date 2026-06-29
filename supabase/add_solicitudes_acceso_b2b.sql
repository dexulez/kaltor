-- Solicitudes de acceso al catálogo B2B (pedidas desde la página pública /acceso-b2b
-- o desde el link de la lista de precios) — el admin las revisa en /usuarios.

CREATE TABLE IF NOT EXISTS b2b_access_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_taller   TEXT        NOT NULL,
  rut             TEXT,
  contacto_nombre TEXT,
  email           TEXT        NOT NULL,
  telefono        TEXT        NOT NULL,
  mensaje         TEXT,
  estado          TEXT        NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  motivo_rechazo  TEXT,
  revisado_por    UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  revisado_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_access_requests_estado ON b2b_access_requests (estado);

ALTER TABLE b2b_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver solicitudes_b2b"        ON b2b_access_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar solicitudes_b2b"  ON b2b_access_requests FOR ALL    TO authenticated USING (true) WITH CHECK (true);

SELECT 'b2b_access_requests' AS tabla, count(*) FROM b2b_access_requests;
