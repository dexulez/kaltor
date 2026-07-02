-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: 15 keys planos → 9 módulos de negocio
-- Kaltor_Arquitectura_Planes.md § 2
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 0. Registrar los 9 nuevos keys en el catálogo modules ──────────────────

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


-- ─── 1. Migrar store_modules ─────────────────────────────────────────────────

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'ventas', true FROM store_modules
WHERE module_key IN ('caja', 'clientes') AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'compras', true FROM store_modules
WHERE module_key = 'compras' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'productos', true FROM store_modules
WHERE module_key IN ('inventario', 'catalogo_b2b') AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'servicios', true FROM store_modules
WHERE module_key = 'servicios' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'taller', true FROM store_modules
WHERE module_key = 'reparaciones' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'informes', true FROM store_modules
WHERE module_key = 'informes' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'contabilidad', true FROM store_modules
WHERE module_key = 'contabilidad' AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

INSERT INTO store_modules (store_id, module_key, activo)
SELECT DISTINCT store_id, 'canal_b2b', true FROM store_modules
WHERE module_key IN ('pedidos_b2b', 'catalogo_b2b') AND activo = true
ON CONFLICT (store_id, module_key) DO NOTHING;

-- configuracion siempre activo en todas las tiendas
INSERT INTO store_modules (store_id, module_key, activo)
SELECT id, 'configuracion', true FROM stores
ON CONFLICT (store_id, module_key) DO NOTHING;

-- Eliminar keys viejos
DELETE FROM store_modules
WHERE module_key IN (
  'dashboard', 'caja', 'clientes', 'compras', 'inventario',
  'catalogo_b2b', 'pedidos_b2b', 'servicios', 'reparaciones',
  'informes', 'contabilidad', 'notificaciones', 'usuarios', 'manuales'
);


-- ─── 2. Resetear plan_modules ────────────────────────────────────────────────
-- Columna identificadora en plans: slug (basico, pro, taller-basico, etc.)

DELETE FROM plan_modules;

-- Básico: ventas, compras, productos, configuracion
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'),('compras'),('productos'),('configuracion')
) AS m(key)
WHERE plans.slug = 'basico';

-- Pro: + informes, contabilidad
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'),('compras'),('productos'),('configuracion'),
  ('informes'),('contabilidad')
) AS m(key)
WHERE plans.slug = 'pro';

-- Taller Básico: + servicios, taller
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'),('compras'),('productos'),('configuracion'),
  ('servicios'),('taller')
) AS m(key)
WHERE plans.slug = 'taller-basico';

-- Taller Básico 5U: mismos módulos que Taller Básico
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'),('compras'),('productos'),('configuracion'),
  ('servicios'),('taller')
) AS m(key)
WHERE plans.slug = 'taller-basico-5u';

-- Taller Multiusuario: + informes, contabilidad
INSERT INTO plan_modules (plan_id, module_key)
SELECT id, m.key FROM plans, (VALUES
  ('ventas'),('compras'),('productos'),('configuracion'),
  ('servicios'),('taller'),('informes'),('contabilidad')
) AS m(key)
WHERE plans.slug = 'taller-multiusuario';


-- ─── 3. Limpiar keys viejos del catálogo modules ─────────────────────────────

DELETE FROM modules
WHERE key IN (
  'dashboard', 'caja', 'clientes', 'inventario',
  'catalogo_b2b', 'pedidos_b2b', 'reparaciones',
  'notificaciones', 'usuarios', 'manuales'
);


-- ─── 4. Resumen ──────────────────────────────────────────────────────────────
SELECT module_key, count(*) AS tiendas
FROM store_modules
GROUP BY module_key
ORDER BY module_key;

COMMIT;
