-- ============================================================
-- KALTOR PHASE 1-C: Políticas RLS multi-tenant
-- Ejecutar DESPUÉS de Phase 1-A y 1-B
-- IMPORTANTE: Verificar que la query de verificación de 1-B
--             muestre 0 filas sin store_id antes de ejecutar esto
-- Supabase Dashboard > SQL Editor > New query > Paste > Run
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Eliminar TODAS las políticas RLS existentes en tablas de datos
--    (se reemplazan por la política única "kaltor_v1")
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename NOT IN (
      'plans', 'modules', 'plan_modules', 'stores', 'store_modules'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
  RAISE NOTICE 'Políticas anteriores eliminadas exitosamente';
END;
$$;

-- ------------------------------------------------------------
-- 2. Habilitar RLS en todas las tablas de datos
-- ------------------------------------------------------------
ALTER TABLE user_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_settlements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_order_services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_service_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_deposits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment               ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_manuals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_caja           ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos_caja            ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_extras           ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_fijos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_bancarias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligaciones_tributarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_previsionales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuales                ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_taller        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. Política store-scoped en tablas de datos
--    Usuarios autenticados solo acceden a datos de su tienda.
--    get_current_store_id() es SECURITY DEFINER: no genera
--    recursión al leer user_profiles internamente.
-- ------------------------------------------------------------

CREATE POLICY "kaltor_v1" ON user_profiles
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON customers
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON products
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON product_categories
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON suppliers
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON purchase_orders
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON purchase_order_items
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON purchase_order_payments
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON supplier_settlements
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON sales
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON sale_items
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON repair_orders
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON repair_items
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON repair_status_history
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON repair_order_services
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON repair_service_items
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON repair_services
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON repair_deposits
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON equipment
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON equipment_manuals
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON sales_orders
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON sales_order_items
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON sales_order_payments
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON notifications
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON system_config
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON stock_movements
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON sesiones_caja
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON arqueos_caja
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON gastos
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON gastos_extras
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON gastos_fijos
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON cuentas_bancarias
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON obligaciones_tributarias
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON pagos_previsionales
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON manuales
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON empleados_taller
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

CREATE POLICY "kaltor_v1" ON audit_logs
  FOR ALL TO authenticated
  USING  (store_id = get_current_store_id())
  WITH CHECK (store_id = get_current_store_id());

-- ------------------------------------------------------------
-- 4. RLS en tablas del catálogo Kaltor (nuevas)
-- ------------------------------------------------------------
ALTER TABLE stores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_modules ENABLE ROW LEVEL SECURITY;

-- stores: usuario solo ve su propia tienda
CREATE POLICY "kaltor_v1" ON stores
  FOR SELECT TO authenticated
  USING (id = get_current_store_id());

-- plans / modules / plan_modules: catálogo público para autenticados
CREATE POLICY "kaltor_read_public" ON plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kaltor_read_public" ON modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kaltor_read_public" ON plan_modules
  FOR SELECT TO authenticated USING (true);

-- store_modules: usuario solo ve módulos de su tienda
CREATE POLICY "kaltor_v1" ON store_modules
  FOR SELECT TO authenticated
  USING (store_id = get_current_store_id());

-- ------------------------------------------------------------
-- 5. roles: tabla global de solo lectura
-- ------------------------------------------------------------
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kaltor_read_public" ON roles
  FOR SELECT TO authenticated USING (true);

COMMIT;

-- Verificación final: mostrar políticas activas
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
