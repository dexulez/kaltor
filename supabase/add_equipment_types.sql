-- ============================================================
-- KALTOR EQUIPMENT TYPES: Catálogo editable de tipos de equipo por tienda
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS equipment_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  value       TEXT NOT NULL,
  label       TEXT NOT NULL,
  icon        TEXT NOT NULL,
  -- Tipo base del que "hereda" la configuración de accesorios/condición física
  -- (una de las 14 claves de CONFIG_TIPO_EQUIPO en src/lib/tipoEquipo.ts)
  template    TEXT NOT NULL DEFAULT 'otro',
  orden       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, value)
);

ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store members can manage equipment_types"
  ON equipment_types
  FOR ALL
  USING (
    store_id IN (SELECT store_id FROM user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    store_id IN (SELECT store_id FROM user_profiles WHERE id = auth.uid())
  );

-- Sembrar el catálogo base (los 14 tipos actuales) para toda tienda que
-- todavía no tenga ningún tipo de equipo propio.
INSERT INTO equipment_types (store_id, value, label, icon, template, orden)
SELECT s.id, t.value, t.label, t.icon, t.value, t.orden
FROM stores s
CROSS JOIN (VALUES
  ('smartphone',    'Smartphone',        '📱', 0),
  ('tablet',        'Tablet',            '📱', 1),
  ('laptop',        'Laptop / Notebook', '💻', 2),
  ('pc_all_in_one', 'PC / All In One',   '🖥', 3),
  ('smartwatch',    'Smartwatch',        '⌚', 4),
  ('auriculares',   'Auriculares',       '🎧', 5),
  ('parlante',      'Parlante',          '🔊', 6),
  ('consola',       'Consola',           '🎮', 7),
  ('tv',            'TV / Televisor',    '📺', 8),
  ('mando',         'Mando / Control',   '🕹', 9),
  ('camara',        'Cámara',            '📷', 10),
  ('impresora',     'Impresora',         '🖨', 11),
  ('accesorio',     'Accesorio',         '🔌', 12),
  ('otro',          'Otro',              '🔧', 13)
) AS t(value, label, icon, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_types et WHERE et.store_id = s.id
);

COMMIT;

-- Verificar
SELECT store_id, value, label, icon, template, orden
FROM equipment_types
ORDER BY store_id, orden
LIMIT 20;
