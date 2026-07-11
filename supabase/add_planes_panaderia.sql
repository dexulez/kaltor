-- ============================================================
-- Kaltor: 3 planes dedicados para Panadería y Repostería
-- (Básico, Pro, Multi-tienda) + asignación de módulos
--
-- Nota: estos datos ya fueron insertados en producción directamente
-- vía scripts/setup-planes-panaderia.mjs (usa el service role key,
-- no requiere pegar SQL en el Dashboard). Este archivo queda como
-- documentación del esquema de datos, siguiendo la convención de
-- supabase/insert_planes_kaltor.sql.
-- ============================================================

INSERT INTO plans (nombre, slug, precio_mensual, precio_anual, max_usuarios, sesion_unica, precio_mensual_usd) VALUES
  ('Panadería Básico',       'panaderia-basico',       19990, 199900, 1,    true,  21.04),
  ('Panadería Pro',          'panaderia-pro',          34990, 349900, NULL, false, 36.83),
  ('Panadería Multi-tienda', 'panaderia-multi-tienda', 89990, 899900, NULL, false, 94.73)
ON CONFLICT (slug) DO UPDATE SET
  nombre             = EXCLUDED.nombre,
  precio_mensual     = EXCLUDED.precio_mensual,
  precio_anual       = EXCLUDED.precio_anual,
  max_usuarios       = EXCLUDED.max_usuarios,
  sesion_unica       = EXCLUDED.sesion_unica,
  precio_mensual_usd = EXCLUDED.precio_mensual_usd;

-- Panadería Básico: ventas, compras, productos, informes, trazabilidad, configuracion, panaderia
WITH p AS (SELECT id FROM plans WHERE slug = 'panaderia-basico')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','informes','trazabilidad','configuracion','panaderia']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Panadería Pro: + contabilidad, conciliaciones
WITH p AS (SELECT id FROM plans WHERE slug = 'panaderia-pro')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','informes','contabilidad','conciliaciones','trazabilidad','configuracion','panaderia']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Panadería Multi-tienda: + canal_b2b (hasta 3 tiendas y multiusuario)
WITH p AS (SELECT id FROM plans WHERE slug = 'panaderia-multi-tienda')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','informes','contabilidad','conciliaciones','canal_b2b','trazabilidad','configuracion','panaderia']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Verificación
SELECT p.nombre, p.precio_mensual, p.precio_anual, COUNT(pm.module_key) AS modulos
FROM plans p
LEFT JOIN plan_modules pm ON pm.plan_id = p.id
WHERE p.slug LIKE 'panaderia-%'
GROUP BY p.id, p.nombre, p.precio_mensual, p.precio_anual
ORDER BY p.precio_mensual;
