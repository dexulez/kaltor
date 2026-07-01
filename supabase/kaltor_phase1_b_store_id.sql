-- ============================================================
-- KALTOR PHASE 1-B: Agregar store_id a todas las tablas
-- Ejecutar DESPUÉS de Phase 1-A
-- Supabase Dashboard > SQL Editor > New query > Paste > Run
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Agregar columna store_id a todas las tablas de datos
-- ------------------------------------------------------------
ALTER TABLE customers               ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE products                ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE product_categories      ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE suppliers               ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE purchase_orders         ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE purchase_order_items    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE purchase_order_payments ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE supplier_settlements    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE sales                   ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE sale_items              ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE repair_orders           ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE repair_items            ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE repair_status_history   ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE repair_order_services   ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE repair_service_items    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE repair_services         ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE repair_deposits         ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE equipment               ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE equipment_manuals       ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE sales_orders            ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE sales_order_items       ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE sales_order_payments    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE notifications           ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE system_config           ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE stock_movements         ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE sesiones_caja           ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE arqueos_caja            ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE gastos                  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE gastos_extras           ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE gastos_fijos            ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE cuentas_bancarias       ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE obligaciones_tributarias ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE pagos_previsionales     ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE manuales                ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE empleados_taller        ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE audit_logs              ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- ------------------------------------------------------------
-- 2. Backfill: asignar store_id de Servitec a todos los datos existentes
-- ------------------------------------------------------------
DO $$
DECLARE
  v_store_id UUID;
  v_count    INTEGER;
BEGIN
  SELECT id INTO v_store_id FROM stores WHERE slug = 'servitec';

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Tienda Servitec no encontrada. ¿Ejecutaste kaltor_phase1_a_foundation.sql?';
  END IF;

  UPDATE customers               SET store_id = v_store_id WHERE store_id IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'customers: % filas actualizadas', v_count;

  UPDATE products                SET store_id = v_store_id WHERE store_id IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'products: % filas actualizadas', v_count;

  UPDATE product_categories      SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE suppliers               SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE purchase_orders         SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE purchase_order_items    SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE purchase_order_payments SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE supplier_settlements    SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE sales                   SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE sale_items              SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE repair_orders           SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE repair_items            SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE repair_status_history   SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE repair_order_services   SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE repair_service_items    SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE repair_services         SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE repair_deposits         SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE equipment               SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE equipment_manuals       SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE sales_orders            SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE sales_order_items       SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE sales_order_payments    SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE notifications           SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE system_config           SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE stock_movements         SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE sesiones_caja           SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE arqueos_caja            SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE gastos                  SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE gastos_extras           SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE gastos_fijos            SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE cuentas_bancarias       SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE obligaciones_tributarias SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE pagos_previsionales     SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE manuales                SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE empleados_taller        SET store_id = v_store_id WHERE store_id IS NULL;
  UPDATE audit_logs              SET store_id = v_store_id WHERE store_id IS NULL;

  RAISE NOTICE 'Backfill completado. store_id de Servitec: %', v_store_id;
END;
$$;

-- ------------------------------------------------------------
-- 3. Función trigger: auto-asignar store_id en cada INSERT
--    Evita tener que enviar store_id explícitamente desde el app
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
-- 4. Triggers de auto-asignación en todas las tablas de datos
-- ------------------------------------------------------------
CREATE OR REPLACE TRIGGER trig_store_id_customers
  BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_products
  BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_product_categories
  BEFORE INSERT ON product_categories FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_suppliers
  BEFORE INSERT ON suppliers FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_purchase_orders
  BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_purchase_order_items
  BEFORE INSERT ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_purchase_order_payments
  BEFORE INSERT ON purchase_order_payments FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_supplier_settlements
  BEFORE INSERT ON supplier_settlements FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_sales
  BEFORE INSERT ON sales FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_sale_items
  BEFORE INSERT ON sale_items FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_repair_orders
  BEFORE INSERT ON repair_orders FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_repair_items
  BEFORE INSERT ON repair_items FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_repair_status_history
  BEFORE INSERT ON repair_status_history FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_repair_order_services
  BEFORE INSERT ON repair_order_services FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_repair_service_items
  BEFORE INSERT ON repair_service_items FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_repair_services
  BEFORE INSERT ON repair_services FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_repair_deposits
  BEFORE INSERT ON repair_deposits FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_equipment
  BEFORE INSERT ON equipment FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_equipment_manuals
  BEFORE INSERT ON equipment_manuals FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_sales_orders
  BEFORE INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_sales_order_items
  BEFORE INSERT ON sales_order_items FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_sales_order_payments
  BEFORE INSERT ON sales_order_payments FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_notifications
  BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_system_config
  BEFORE INSERT ON system_config FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_stock_movements
  BEFORE INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_sesiones_caja
  BEFORE INSERT ON sesiones_caja FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_arqueos_caja
  BEFORE INSERT ON arqueos_caja FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_gastos
  BEFORE INSERT ON gastos FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_gastos_extras
  BEFORE INSERT ON gastos_extras FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_gastos_fijos
  BEFORE INSERT ON gastos_fijos FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_cuentas_bancarias
  BEFORE INSERT ON cuentas_bancarias FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_obligaciones_tributarias
  BEFORE INSERT ON obligaciones_tributarias FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_pagos_previsionales
  BEFORE INSERT ON pagos_previsionales FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_manuales
  BEFORE INSERT ON manuales FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_empleados_taller
  BEFORE INSERT ON empleados_taller FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

CREATE OR REPLACE TRIGGER trig_store_id_audit_logs
  BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

COMMIT;

-- Verificación: contar filas sin store_id (deben ser 0 en todas)
SELECT
  tablename,
  (xpath('/row/cnt/text()',
    query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I WHERE store_id IS NULL', tablename), true, true, '')
  ))[1]::text::int AS filas_sin_store_id
FROM (VALUES
  ('customers'), ('products'), ('product_categories'), ('suppliers'),
  ('purchase_orders'), ('sales'), ('repair_orders'), ('equipment'),
  ('sales_orders'), ('system_config'), ('manuales'), ('empleados_taller'),
  ('notifications'), ('sesiones_caja'), ('gastos'), ('audit_logs')
) AS t(tablename)
ORDER BY tablename;
