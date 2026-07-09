-- ============================================================
-- Kaltor: insertar módulos, 7 planes y sus asignaciones
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Insertar las claves de módulo que usa la app (FK requerida por plan_modules y store_modules)
INSERT INTO modules (key, nombre, descripcion) VALUES
  ('ventas',        'Ventas',                   'Punto de venta, boletas y facturación'),
  ('compras',       'Compras',                  'Órdenes de compra, proveedores y pagos'),
  ('productos',     'Inventario',               'Control de productos, stock y movimientos'),
  ('servicios',     'Servicios',                'Catálogo de servicios de reparación'),
  ('taller',        'Taller',                   'Órdenes de trabajo y técnicos'),
  ('informes',      'Informes',                 'Reportes y estadísticas de negocio'),
  ('contabilidad',  'Contabilidad',             'Gastos, cuentas y obligaciones tributarias'),
  ('canal_b2b',     'Canal B2B',               'Catálogo mayorista y pedidos B2B'),
  ('configuracion', 'Configuración',            'Ajustes del sistema'),
  ('manuales',      'Manuales',                 'Base de conocimiento y procedimientos internos'),
  ('conciliaciones','Conciliaciones bancarias', 'Gestión y conciliación de cuentas bancarias'),
  ('trazabilidad',  'Trazabilidad',             'Historial detallado de movimientos y auditoría')
ON CONFLICT (key) DO NOTHING;

-- 2. Insertar los 7 planes (ON CONFLICT por slug — columna UNIQUE)
INSERT INTO plans (nombre, slug, precio_mensual, precio_anual, max_usuarios, sesion_unica) VALUES
  ('Básico',              'basico',              14990,  149900, 1,    true),
  ('Pro',                 'pro',                 23990,  239900, NULL, false),
  ('Taller Básico',       'taller-basico',       19990,  199900, 1,    true),
  ('Taller Básico 5U',    'taller-basico-5u',    29990,  299900, 5,    false),
  ('Taller Multiusuario', 'taller-multiusuario', 36990,  369900, NULL, false),
  ('Taller Pro',          'taller-pro',          44990,  449900, NULL, false),
  ('Taller Multi-tienda', 'taller-multi-tienda', 84990,  849900, NULL, false)
ON CONFLICT (slug) DO UPDATE SET
  nombre         = EXCLUDED.nombre,
  precio_mensual = EXCLUDED.precio_mensual,
  precio_anual   = EXCLUDED.precio_anual,
  max_usuarios   = EXCLUDED.max_usuarios,
  sesion_unica   = EXCLUDED.sesion_unica;

-- 3. Asignar módulos por plan
-- Básico: ventas, compras, productos, informes, trazabilidad, configuracion
WITH p AS (SELECT id FROM plans WHERE slug = 'basico')
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m FROM p, UNNEST(ARRAY['ventas','compras','productos','informes','trazabilidad','configuracion']) AS m
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- Pro: + contabilidad, conciliaciones
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

-- 4. Verificar resultado
SELECT p.nombre, p.precio_mensual, p.precio_anual, COUNT(pm.module_key) AS modulos
FROM plans p
LEFT JOIN plan_modules pm ON pm.plan_id = p.id
GROUP BY p.id, p.nombre, p.precio_mensual, p.precio_anual
ORDER BY p.precio_mensual;
