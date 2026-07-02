-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: 15 keys planos → 9 módulos de negocio
-- Kaltor_Arquitectura_Planes.md § 2
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- BACKUP: exportar store_modules antes si querés conservar los datos viejos
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Migrar store_modules ────────────────────────────────────────────────
-- Insertar los nuevos 9 keys mapeados desde los keys viejos de cada tienda.
-- ON CONFLICT DO NOTHING → idempotente si se corre más de una vez.

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'ventas', true
FROM store_modules
WHERE module_key IN ('caja', 'clientes') AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'compras', true
FROM store_modules
WHERE module_key = 'compras' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'productos', true
FROM store_modules
WHERE module_key IN ('inventario', 'catalogo_b2b') AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'servicios', true
FROM store_modules
WHERE module_key = 'servicios' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'taller', true
FROM store_modules
WHERE module_key = 'reparaciones' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'informes', true
FROM store_modules
WHERE module_key = 'informes' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'contabilidad', true
FROM store_modules
WHERE module_key = 'contabilidad' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

-- configuracion siempre activo en todas las tiendas
INSERT INTO store_modules (store_id, module_key, activo)
SELECT id, 'configuracion', true FROM stores
ON CONFLICT (store_id, module_key) DO NOTHING;

-- canal_b2b: solo si la tienda tenía pedidos_b2b O catalogo_b2b activos
INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'canal_b2b', true
FROM store_modules
WHERE module_key IN ('pedidos_b2b', 'catalogo_b2b') AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

-- Eliminar todos los keys viejos
DELETE FROM store_modules
WHERE module_key IN (
  'dashboard', 'caja', 'clientes', 'compras', 'inventario',
  'catalogo_b2b', 'pedidos_b2b', 'servicios', 'reparaciones',
  'informes', 'contabilidad', 'notificaciones', 'usuarios', 'manuales'
);


-- ─── 2. Resetear plan_modules con los 9 módulos de negocio ──────────────────

DELETE FROM plan_modules;

-- Básico: ventas, compras, productos, configuracion
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion')
) AS m(key)
WHERE plans.key = 'basic';

-- Pro: básico + informes, contabilidad
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion'),
  ('informes'), ('contabilidad')
) AS m(key)
WHERE plans.key = 'pro';

-- Taller Básico: básico + servicios, taller
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion'),
  ('servicios'), ('taller')
) AS m(key)
WHERE plans.key = 'taller_basico';

-- Taller Básico 5 Usuarios: mismo módulos que Taller Básico
-- (la diferencia de usuarios va por plans.max_users, no por module_key)
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion'),
  ('servicios'), ('taller')
) AS m(key)
WHERE plans.key = 'taller_basico_5u';

-- Taller Básico Multiusuario: idéntico en módulos a 5U
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion'),
  ('servicios'), ('taller')
) AS m(key)
WHERE plans.key IN ('taller_basico_multiusuario', 'taller_basico_multi');

-- Taller Pro: todos excepto canal_b2b
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion'),
  ('servicios'), ('taller'), ('informes'), ('contabilidad')
) AS m(key)
WHERE plans.key = 'taller_pro';

-- Taller Multi-tienda: todos los 9
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion'),
  ('servicios'), ('taller'), ('informes'), ('contabilidad'), ('canal_b2b')
) AS m(key)
WHERE plans.key IN ('taller_multistore', 'taller_multi_tienda');


-- ─── 3. Resumen final ────────────────────────────────────────────────────────
SELECT 'store_modules después de migración' AS tabla, module_key, count(*) AS tiendas
FROM store_modules
GROUP BY module_key
ORDER BY module_key;

COMMIT;
