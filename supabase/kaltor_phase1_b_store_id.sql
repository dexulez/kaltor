-- ============================================================
-- KALTOR PHASE 1-B: Agregar store_id a todas las tablas
-- Ejecutar DESPUÉS de Phase 1-A
-- Supabase Dashboard > SQL Editor > New query > Paste > Run
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Agregar store_id a todas las tablas que existan
--    (omite silenciosamente las que no existan)
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'customers', 'products', 'product_categories', 'suppliers',
    'purchase_orders', 'purchase_order_items', 'purchase_order_payments',
    'supplier_settlements', 'sales', 'sale_items',
    'repair_orders', 'repair_items', 'repair_status_history',
    'repair_order_services', 'repair_service_items', 'repair_services',
    'repair_deposits', 'equipment', 'equipment_manuals',
    'sales_orders', 'sales_order_items', 'sales_order_payments',
    'notifications', 'system_config', 'stock_movements',
    'sesiones_caja', 'arqueos_caja', 'gastos', 'gastos_extras',
    'gastos_fijos', 'cuentas_bancarias', 'obligaciones_tributarias',
    'pagos_previsionales', 'manuales', 'empleados_taller', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id)', t
      );
      RAISE NOTICE 'store_id agregado a: %', t;
    ELSE
      RAISE NOTICE 'Tabla no existe (omitida): %', t;
    END IF;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 2. Backfill: asignar store_id de Servitec a todos los datos existentes
-- ------------------------------------------------------------
DO $$
DECLARE
  v_store_id UUID;
  v_count    INTEGER;
  t          TEXT;
  tablas TEXT[] := ARRAY[
    'customers', 'products', 'product_categories', 'suppliers',
    'purchase_orders', 'purchase_order_items', 'purchase_order_payments',
    'supplier_settlements', 'sales', 'sale_items',
    'repair_orders', 'repair_items', 'repair_status_history',
    'repair_order_services', 'repair_service_items', 'repair_services',
    'repair_deposits', 'equipment', 'equipment_manuals',
    'sales_orders', 'sales_order_items', 'sales_order_payments',
    'notifications', 'system_config', 'stock_movements',
    'sesiones_caja', 'arqueos_caja', 'gastos', 'gastos_extras',
    'gastos_fijos', 'cuentas_bancarias', 'obligaciones_tributarias',
    'pagos_previsionales', 'manuales', 'empleados_taller', 'audit_logs'
  ];
BEGIN
  SELECT id INTO v_store_id FROM stores WHERE slug = 'servitec';

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Tienda Servitec no encontrada. ¿Ejecutaste kaltor_phase1_a_foundation.sql?';
  END IF;

  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('UPDATE %I SET store_id = $1 WHERE store_id IS NULL', t)
        USING v_store_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '%: % filas actualizadas', t, v_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill completado. store_id de Servitec: %', v_store_id;
END;
$$;

-- ------------------------------------------------------------
-- 3. Función trigger: auto-asignar store_id en cada INSERT
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION kaltor_auto_store_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.store_id IS NULL THEN
    NEW.store_id := get_current_store_id();
  END IF;
  IF NEW.store_id IS NULL THEN
    RAISE EXCEPTION 'INSERT rechazado: usuario sin tienda vinculada (store_id nulo)';
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4. Triggers en todas las tablas que existan
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'customers', 'products', 'product_categories', 'suppliers',
    'purchase_orders', 'purchase_order_items', 'purchase_order_payments',
    'supplier_settlements', 'sales', 'sale_items',
    'repair_orders', 'repair_items', 'repair_status_history',
    'repair_order_services', 'repair_service_items', 'repair_services',
    'repair_deposits', 'equipment', 'equipment_manuals',
    'sales_orders', 'sales_order_items', 'sales_order_payments',
    'notifications', 'system_config', 'stock_movements',
    'sesiones_caja', 'arqueos_caja', 'gastos', 'gastos_extras',
    'gastos_fijos', 'cuentas_bancarias', 'obligaciones_tributarias',
    'pagos_previsionales', 'manuales', 'empleados_taller', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trig_store_id_%s ON %I; '
        'CREATE TRIGGER trig_store_id_%s '
        'BEFORE INSERT ON %I '
        'FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id()',
        t, t, t, t
      );
      RAISE NOTICE 'Trigger creado en: %', t;
    END IF;
  END LOOP;
END;
$$;

COMMIT;

-- ------------------------------------------------------------
-- Verificación: tablas que obtuvieron store_id y cuántas filas
-- tienen NULL (deben ser todas 0)
-- ------------------------------------------------------------
SELECT
  c.table_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = c.table_name
        AND column_name = 'store_id'
    ) THEN 'OK'
    ELSE 'SIN COLUMNA'
  END AS columna_store_id
FROM information_schema.tables c
WHERE c.table_schema = 'public'
  AND c.table_type = 'BASE TABLE'
  AND c.table_name NOT IN ('plans','modules','plan_modules','stores','store_modules','roles')
ORDER BY c.table_name;
