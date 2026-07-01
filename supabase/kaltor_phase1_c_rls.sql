-- ============================================================
-- KALTOR PHASE 1-C: Políticas RLS multi-tenant
-- Ejecutar DESPUÉS de Phase 1-A y 1-B
-- Supabase Dashboard > SQL Editor > New query > Paste > Run
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Eliminar TODAS las políticas RLS existentes en tablas de datos
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename NOT IN ('plans', 'modules', 'plan_modules', 'stores', 'store_modules')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
  RAISE NOTICE 'Políticas anteriores eliminadas';
END;
$$;

-- ------------------------------------------------------------
-- 2. Habilitar RLS y crear policy kaltor_v1 en tablas de datos
--    (omite las tablas que no existan)
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'user_profiles',
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
      -- Habilitar RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

      -- Crear política de aislamiento por tienda
      EXECUTE format(
        'CREATE POLICY kaltor_v1 ON %I '
        'FOR ALL TO authenticated '
        'USING (store_id = get_current_store_id()) '
        'WITH CHECK (store_id = get_current_store_id())',
        t
      );
      RAISE NOTICE 'RLS kaltor_v1 aplicado a: %', t;
    ELSE
      RAISE NOTICE 'Tabla no existe (omitida): %', t;
    END IF;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 3. Tablas del catálogo Kaltor (stores, plans, modules...)
-- ------------------------------------------------------------

-- stores: habilitada en fase A; usuario solo ve su propia tienda
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kaltor_v1" ON stores
  FOR SELECT TO authenticated
  USING (id = get_current_store_id());

-- plans, modules, plan_modules: catálogo de lectura pública para autenticados
ALTER TABLE plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kaltor_read_public" ON plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kaltor_read_public" ON modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kaltor_read_public" ON plan_modules
  FOR SELECT TO authenticated USING (true);

-- store_modules: usuario solo ve módulos de su tienda
ALTER TABLE store_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kaltor_v1" ON store_modules
  FOR SELECT TO authenticated
  USING (store_id = get_current_store_id());

-- ------------------------------------------------------------
-- 4. roles: tabla global, solo lectura
-- ------------------------------------------------------------
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kaltor_read_public" ON roles
  FOR SELECT TO authenticated USING (true);

COMMIT;

-- Verificación: políticas activas en todas las tablas
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
