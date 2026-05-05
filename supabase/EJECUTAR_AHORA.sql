-- ============================================================
-- MIGRACIONES PENDIENTES — Ejecutar completo en Supabase Dashboard → SQL Editor
-- Copia TODO el contenido y pégalo de una sola vez.
-- ============================================================


-- ============================================================
-- 1. AGREGAR COLUMNA permisos_modulos A user_profiles
--    (resuelve el error 404 al editar usuarios)
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS permisos_modulos JSONB DEFAULT NULL;

-- NULL = usar defaults del rol
-- Objeto JSON = permisos explícitos por usuario
-- Ejemplo: '{"dashboard":true,"clientes":true,"reparaciones":false}'


-- ============================================================
-- 2. INSERTAR ROL supervisor_ventas
--    (lo hace aparecer en el dropdown de roles)
-- ============================================================

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
    "configuracion": "ninguno"
  }'
)
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- 3. ACTUALIZAR POLÍTICAS RLS PARA supervisor_ventas
-- ============================================================

-- Clientes: supervisor puede crear/editar
DROP POLICY IF EXISTS "customers_write" ON customers;
CREATE POLICY "customers_write" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));

-- OTs: supervisor puede leer todas
DROP POLICY IF EXISTS "ot_vendedor" ON repair_orders;
CREATE POLICY "ot_vendedor" ON repair_orders FOR SELECT TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- OTs: supervisor puede crear nuevas
DROP POLICY IF EXISTS "ot_vendedor_write" ON repair_orders;
CREATE POLICY "ot_vendedor_write" ON repair_orders FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- Ventas: supervisor tiene acceso completo
DROP POLICY IF EXISTS "sales_vendedor" ON sales;
CREATE POLICY "sales_vendedor" ON sales FOR ALL TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- Compras: supervisor solo lectura
DROP POLICY IF EXISTS "po_supervisor_read" ON purchase_orders;
CREATE POLICY "po_supervisor_read" ON purchase_orders FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');

DROP POLICY IF EXISTS "po_items_supervisor_read" ON purchase_order_items;
CREATE POLICY "po_items_supervisor_read" ON purchase_order_items FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');

-- Cierres de caja: supervisor puede ver
DROP POLICY IF EXISTS "cash_read" ON cash_closings;
CREATE POLICY "cash_read" ON cash_closings FOR SELECT TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));


-- ============================================================
-- VERIFICACIÓN — Los resultados deben mostrar:
--   1. La columna permisos_modulos en user_profiles
--   2. El rol supervisor_ventas en la tabla roles
-- ============================================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'permisos_modulos';

SELECT id, nombre, descripcion
FROM roles
ORDER BY nombre;
