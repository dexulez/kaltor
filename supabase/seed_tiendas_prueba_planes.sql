-- ============================================================
-- Tiendas de prueba: una por cada plan de Kaltor
-- Permite probar el sistema con las restricciones reales de
-- cada plan (módulos habilitados, límite de usuarios, etc.)
-- Ejecutar en Supabase SQL Editor, DESPUÉS de kaltor_phase1_a_foundation.sql
-- Después de correr esto: correr scripts/crear-usuarios-prueba.mjs
-- para crear el usuario administrador de cada tienda de prueba.
-- ============================================================

BEGIN;

-- 1. Una tienda de prueba por cada plan
INSERT INTO stores (nombre, slug, email, plan_id, activo)
SELECT
  'PRUEBA - ' || p.nombre,
  'prueba-' || p.slug,
  'test-' || p.slug || '@kaltorpos.com',
  p.id,
  true
FROM plans p
ON CONFLICT (slug) DO NOTHING;

-- 2. Módulos de cada tienda de prueba = módulos de su plan
INSERT INTO store_modules (store_id, module_key, activo)
SELECT s.id, pm.module_key, true
FROM stores s
JOIN plans p ON p.id = s.plan_id
JOIN plan_modules pm ON pm.plan_id = p.id
WHERE s.slug LIKE 'prueba-%'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificación
SELECT s.nombre AS tienda, s.slug, s.email, p.nombre AS plan,
       COUNT(sm.module_key) AS modulos_activos
FROM stores s
LEFT JOIN plans p ON p.id = s.plan_id
LEFT JOIN store_modules sm ON sm.store_id = s.id
WHERE s.slug LIKE 'prueba-%'
GROUP BY s.nombre, s.slug, s.email, p.nombre
ORDER BY s.nombre;
