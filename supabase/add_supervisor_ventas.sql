-- ============================================================
-- MIGRACIÓN: Agregar rol supervisor_ventas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Insertar el nuevo rol
INSERT INTO roles (nombre, descripcion, es_sistema, permisos)
VALUES (
  'supervisor_ventas',
  'Supervisa el equipo de ventas, acceso completo a caja e informes, lectura de compras',
  true,
  '{
    "dashboard": "completo",
    "clientes": "completo",
    "recepcion": "completo",
    "reparaciones": "lectura",
    "caja": "completo",
    "inventario": "lectura",
    "compras": "lectura",
    "usuarios": "ninguno",
    "informes": "completo",
    "configuracion": "ninguno",
    "creditos_proveedores": "ninguno"
  }'
)
ON CONFLICT (nombre) DO NOTHING;


-- 2. customers: supervisor puede crear/editar clientes
DROP POLICY IF EXISTS "customers_write" ON customers;
CREATE POLICY "customers_write" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));


-- 3. repair_orders: supervisor puede leer todas las OT y crear nuevas
DROP POLICY IF EXISTS "ot_vendedor" ON repair_orders;
CREATE POLICY "ot_vendedor" ON repair_orders FOR SELECT TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- Permitir insertar OTs (recepción de equipos)
DROP POLICY IF EXISTS "ot_vendedor_write" ON repair_orders;
CREATE POLICY "ot_vendedor_write" ON repair_orders FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('vendedor', 'supervisor_ventas'));


-- 4. sales: supervisor tiene acceso completo igual que vendedor
DROP POLICY IF EXISTS "sales_vendedor" ON sales;
CREATE POLICY "sales_vendedor" ON sales FOR ALL TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));


-- 5. purchase_orders: supervisor solo lectura
DROP POLICY IF EXISTS "po_supervisor_read" ON purchase_orders;
CREATE POLICY "po_supervisor_read" ON purchase_orders FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');

DROP POLICY IF EXISTS "po_items_supervisor_read" ON purchase_order_items;
CREATE POLICY "po_items_supervisor_read" ON purchase_order_items FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');


-- 6. cash_closings: supervisor puede ver cierres de caja
DROP POLICY IF EXISTS "cash_read" ON cash_closings;
CREATE POLICY "cash_read" ON cash_closings FOR SELECT TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));


-- Verificar que el rol fue creado
SELECT id, nombre, descripcion FROM roles ORDER BY nombre;
