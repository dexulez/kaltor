-- ============================================================
-- KALTOR PHASE 1-A: Fundación Multi-tenant
-- Ejecutar PRIMERO, antes que B y C
-- Supabase Dashboard > SQL Editor > New query > Paste > Run
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. TABLA: plans — catálogo de planes Kaltor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  precio_mensual INTEGER NOT NULL,   -- CLP sin IVA
  precio_anual   INTEGER NOT NULL,   -- CLP sin IVA (total año)
  max_usuarios   INTEGER,            -- NULL = ilimitado
  sesion_unica   BOOLEAN DEFAULT false,
  activo         BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. TABLA: modules — catálogo de módulos del sistema
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules (
  key        TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL,
  descripcion TEXT,
  activo     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. TABLA: plan_modules — qué módulos incluye cada plan
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_modules (
  plan_id    UUID REFERENCES plans(id) ON DELETE CASCADE,
  module_key TEXT REFERENCES modules(key) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, module_key)
);

-- ------------------------------------------------------------
-- 4. TABLA: stores — tenants (clientes del SaaS Kaltor)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  slug            TEXT UNIQUE,
  rut             TEXT,
  email           TEXT,
  plan_id         UUID REFERENCES plans(id),
  activo          BOOLEAN DEFAULT true,
  trial_hasta     TIMESTAMPTZ,
  stripe_customer TEXT,          -- usado en Phase 6 (Stripe)
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. TABLA: store_modules — módulos activos por tienda
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_modules (
  store_id   UUID REFERENCES stores(id) ON DELETE CASCADE,
  module_key TEXT REFERENCES modules(key) ON DELETE CASCADE,
  activo     BOOLEAN DEFAULT true,
  PRIMARY KEY (store_id, module_key)
);

-- ------------------------------------------------------------
-- 6. Agregar store_id a user_profiles
-- ------------------------------------------------------------
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- ------------------------------------------------------------
-- 7. Función: get_current_store_id()
--    SECURITY DEFINER evita recursión cuando user_profiles
--    tiene RLS activo (la función lo lee sin restricciones)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_store_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT store_id
    FROM user_profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- ------------------------------------------------------------
-- 8. SEED: 9 módulos
-- ------------------------------------------------------------
INSERT INTO modules (key, nombre, descripcion) VALUES
  ('inventory',   'Inventario',   'Control de productos, stock y movimientos'),
  ('purchases',   'Compras',      'Órdenes de compra, proveedores y pagos'),
  ('sales',       'Ventas',       'Punto de venta, boletas y facturación'),
  ('repair_shop', 'Taller',       'Órdenes de trabajo, reparaciones y técnicos'),
  ('reports',     'Informes',     'Reportes y estadísticas de negocio'),
  ('hr',          'RRHH',         'Empleados, asistencia y remuneraciones'),
  ('accounting',  'Contabilidad', 'Gastos, cuentas y obligaciones tributarias'),
  ('manuals',     'Manuales',     'Base de conocimiento y procedimientos internos'),
  ('multi_store', 'Multi-tienda', 'Multi-sucursal y B2B Wholesale')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 9. SEED: 7 planes Kaltor
-- ------------------------------------------------------------
INSERT INTO plans (nombre, slug, precio_mensual, precio_anual, max_usuarios, sesion_unica) VALUES
  ('Básico',              'basico',              14990,  149900, 1,    true),
  ('Pro',                 'pro',                 23990,  239900, NULL, false),
  ('Taller Básico',       'taller-basico',       19990,  199900, 1,    true),
  ('Taller Básico 5U',    'taller-basico-5u',    29990,  299900, 5,    false),
  ('Taller Multiusuario', 'taller-multiusuario', 36990,  369900, NULL, false),
  ('Taller Pro',          'taller-pro',          44990,  449900, NULL, false),
  ('Taller Multi-tienda', 'taller-multi-tienda', 84990,  849900, NULL, false)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 10. SEED: plan_modules (módulos de cada plan)
-- ------------------------------------------------------------
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m.module_key
FROM plans p
CROSS JOIN (VALUES
  ('basico',              'inventory'),
  ('basico',              'purchases'),
  ('basico',              'sales'),
  ('pro',                 'inventory'),
  ('pro',                 'purchases'),
  ('pro',                 'sales'),
  ('pro',                 'reports'),
  ('pro',                 'hr'),
  ('pro',                 'accounting'),
  ('pro',                 'manuals'),
  ('taller-basico',       'inventory'),
  ('taller-basico',       'purchases'),
  ('taller-basico',       'sales'),
  ('taller-basico',       'repair_shop'),
  ('taller-basico-5u',    'inventory'),
  ('taller-basico-5u',    'purchases'),
  ('taller-basico-5u',    'sales'),
  ('taller-basico-5u',    'repair_shop'),
  ('taller-multiusuario', 'inventory'),
  ('taller-multiusuario', 'purchases'),
  ('taller-multiusuario', 'sales'),
  ('taller-multiusuario', 'repair_shop'),
  ('taller-pro',          'inventory'),
  ('taller-pro',          'purchases'),
  ('taller-pro',          'sales'),
  ('taller-pro',          'repair_shop'),
  ('taller-pro',          'reports'),
  ('taller-pro',          'hr'),
  ('taller-pro',          'accounting'),
  ('taller-pro',          'manuals'),
  ('taller-multi-tienda', 'inventory'),
  ('taller-multi-tienda', 'purchases'),
  ('taller-multi-tienda', 'sales'),
  ('taller-multi-tienda', 'repair_shop'),
  ('taller-multi-tienda', 'reports'),
  ('taller-multi-tienda', 'hr'),
  ('taller-multi-tienda', 'accounting'),
  ('taller-multi-tienda', 'manuals'),
  ('taller-multi-tienda', 'multi_store')
) AS m(plan_slug, module_key)
WHERE p.slug = m.plan_slug
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 11. SEED: Tienda fundadora — Servitec SpA
-- ------------------------------------------------------------
INSERT INTO stores (nombre, slug, email, plan_id, activo)
SELECT
  'Servitec SpA',
  'servitec',
  'importadorayserviciosservitec@gmail.com',
  p.id,
  true
FROM plans p
WHERE p.slug = 'taller-multi-tienda'
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 12. Módulos de Servitec: todos activos (plan taller-multi-tienda)
-- ------------------------------------------------------------
INSERT INTO store_modules (store_id, module_key, activo)
SELECT s.id, m.key, true
FROM stores s
CROSS JOIN modules m
WHERE s.slug = 'servitec'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 13. Vincular todos los usuarios actuales a Servitec
-- ------------------------------------------------------------
UPDATE user_profiles
SET store_id = (SELECT id FROM stores WHERE slug = 'servitec')
WHERE store_id IS NULL;

COMMIT;

-- Verificación
SELECT
  s.nombre AS tienda,
  s.slug,
  p.nombre AS plan,
  COUNT(sm.module_key) AS modulos_activos,
  COUNT(up.id) AS usuarios_vinculados
FROM stores s
LEFT JOIN plans p ON p.id = s.plan_id
LEFT JOIN store_modules sm ON sm.store_id = s.id
LEFT JOIN user_profiles up ON up.store_id = s.id
GROUP BY s.nombre, s.slug, p.nombre;
