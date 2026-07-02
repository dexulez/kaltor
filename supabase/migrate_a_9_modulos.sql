-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: 15 keys planos → 9 módulos de negocio
-- Kaltor_Arquitectura_Planes.md § 2
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- BACKUP: exportar store_modules antes si querés conservar los datos viejos
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 0. Agregar los 9 nuevos keys al catálogo modules ───────────────────────
-- store_modules.module_key tiene FK → modules, hay que registrarlos primero.

INSERT INTO modules (key, nombre, descripcion) VALUES
  ('ventas',        'Ventas',        'Caja, punto de venta y clientes')
 ,('compras',       'Compras',       'Órdenes de compra y proveedores')
 ,('productos',     'Productos',     'Inventario y catálogo de productos')
 ,('servicios',     'Servicios',     'Catálogo de servicios de taller')
 ,('taller',        'Taller',        'Reparaciones y órdenes de trabajo')
 ,('informes',      'Informes',      'Reportes y análisis de negocio')
 ,('contabilidad',  'Contabilidad',  'Contabilidad y comprobantes')
 ,('configuracion', 'Configuración', 'Configuración general del sistema')
 ,('canal_b2b',     'Canal B2B',     'Catálogo y pedidos B2B')
ON CONFLICT (key) DO NOTHING;


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

-- Eliminar todos los keys viejos de store_modules
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

-- Taller Básico 5 Usuarios: mismos módulos que Taller Básico
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'), ('compras'), ('productos'), ('configuracion'),
  ('servicios'), ('taller')
) AS m(key)
WHERE plans.key = 'taller_basico_5u';

-- Taller Básico Multiusuario
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


-- ─── 3. Limpiar keys viejos del catálogo modules ────────────────────────────
-- Solo después de haber migrado store_modules y plan_modules

DELETE FROM modules
WHERE key IN (
  'dashboard', 'caja', 'clientes', 'inventario',
  'catalogo_b2b', 'pedidos_b2b', 'reparaciones',
  'notificaciones', 'usuarios', 'manuales'
);


-- ─── 4. Resumen final ────────────────────────────────────────────────────────
SELECT 'store_modules después de migración' AS tabla, module_key, count(*) AS tiendas
FROM store_modules
GROUP BY module_key
ORDER BY module_key;

COMMIT;
