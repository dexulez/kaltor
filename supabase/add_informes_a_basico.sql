-- ============================================================
-- Agrega el módulo "informes" al plan Básico (ya existente en producción)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Habilitar informes en el plan Básico
WITH p AS (SELECT id FROM plans WHERE slug = 'basico')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, 'informes' FROM p
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- 2. Habilitar informes en las tiendas que ya están en el plan Básico
INSERT INTO store_modules (store_id, module_key, activo)
SELECT s.id, 'informes', true
FROM stores s
JOIN plans p ON p.id = s.plan_id
WHERE p.slug = 'basico'
ON CONFLICT (store_id, module_key) DO UPDATE SET activo = true;

-- 3. Verificar resultado
SELECT s.nombre AS tienda, p.nombre AS plan, sm.module_key, sm.activo
FROM stores s
JOIN plans p ON p.id = s.plan_id
JOIN store_modules sm ON sm.store_id = s.id AND sm.module_key = 'informes'
WHERE p.slug = 'basico'
ORDER BY s.nombre;
