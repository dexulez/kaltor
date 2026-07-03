-- ============================================================
-- Kaltor: insertar los 7 planes y sus módulos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Insertar planes (usa ON CONFLICT por si ya existen)
INSERT INTO plans (nombre, slug, precio_mes)
VALUES
  ('Básico',              'basico',              14990),
  ('Pro',                 'pro',                 23990),
  ('Taller Básico',       'taller-basico',       19990),
  ('Taller Básico 5U',    'taller-basico-5u',    29990),
  ('Taller Multiusuario', 'taller-multiusuario', 36990),
  ('Taller Pro',          'taller-pro',          44990),
  ('Taller Multi-tienda', 'taller-multi-tienda', 84990)
ON CONFLICT (slug) DO UPDATE SET
  nombre     = EXCLUDED.nombre,
  precio_mes = EXCLUDED.precio_mes;

-- 2. Insertar módulos por plan
-- (elimina los existentes para el plan primero para evitar duplicados)

-- Básico: ventas, compras, productos, trazabilidad, configuracion
WITH p AS (SELECT id FROM plans WHERE slug = 'basico')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Pro: + informes, contabilidad, conciliaciones
WITH p AS (SELECT id FROM plans WHERE slug = 'pro')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','informes','contabilidad','conciliaciones','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Taller Básico: + servicios, taller, manuales
WITH p AS (SELECT id FROM plans WHERE slug = 'taller-basico')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Taller Básico 5U: igual que Taller Básico
WITH p AS (SELECT id FROM plans WHERE slug = 'taller-basico-5u')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Taller Multiusuario: + informes, contabilidad
WITH p AS (SELECT id FROM plans WHERE slug = 'taller-multiusuario')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Taller Pro: + conciliaciones
WITH p AS (SELECT id FROM plans WHERE slug = 'taller-pro')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','conciliaciones','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Taller Multi-tienda: todos los módulos
WITH p AS (SELECT id FROM plans WHERE slug = 'taller-multi-tienda')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','servicios','taller','informes','contabilidad','canal_b2b','manuales','conciliaciones','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Verificar resultado
SELECT p.nombre, p.precio_mes, COUNT(pm.module_key) AS modulos
FROM plans p
LEFT JOIN plan_modules pm ON pm.plan_id = p.id
GROUP BY p.id, p.nombre, p.precio_mes
ORDER BY p.precio_mes;
