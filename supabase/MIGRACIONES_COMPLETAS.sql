-- ============================================================
-- MIGRACIONES COMPLETAS — TechRepair Pro
-- Ejecutar TODO de una vez en: Supabase Dashboard → SQL Editor
-- Copia y pega todo el contenido, luego presiona "Run"
-- ============================================================


-- ============================================================
-- 1. COLUMNA permisos_modulos EN user_profiles
--    Permite permisos personalizados por usuario
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS permisos_modulos JSONB DEFAULT NULL;


-- ============================================================
-- 2. COLUMNA costo_insumos_promedio EN system_config
--    Costo promedio de insumos por reparación (soldadura, flux, etc.)
-- ============================================================

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS costo_insumos_promedio INTEGER DEFAULT 0;


-- ============================================================
-- 3. ROL supervisor_ventas
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
-- 4. TABLA audit_logs (log de auditoría de acciones)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  usuario_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nombre TEXT        NOT NULL DEFAULT '',
  accion         TEXT        NOT NULL,
  modulo         TEXT        NOT NULL,
  entidad_id     TEXT,
  entidad_desc   TEXT,
  valor_anterior JSONB,
  valor_nuevo    JSONB,
  metadata       JSONB       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs (usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_modulo  ON audit_logs (modulo);
CREATE INDEX IF NOT EXISTS idx_audit_accion  ON audit_logs (accion);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_admin" ON audit_logs;
CREATE POLICY "audit_select_admin" ON audit_logs
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "audit_insert_all" ON audit_logs;
CREATE POLICY "audit_insert_all" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================================
-- 5. RLS PARA technician_commissions
--    (tabla ya existe en el schema, faltaban las políticas)
-- ============================================================

ALTER TABLE technician_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_admin" ON technician_commissions;
CREATE POLICY "commissions_admin" ON technician_commissions
  FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "commissions_tecnico_own" ON technician_commissions;
CREATE POLICY "commissions_tecnico_own" ON technician_commissions
  FOR SELECT TO authenticated USING (tecnico_id = auth.uid());

DROP POLICY IF EXISTS "commissions_insert" ON technician_commissions;
CREATE POLICY "commissions_insert" ON technician_commissions
  FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================================
-- 6. CATEGORÍAS DE PRODUCTOS (datos iniciales)
--    Si ya existen no hace nada (ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO product_categories (nombre, tipo, vendible) VALUES
  ('Repuestos',                         'repuesto',    true),
  ('Accesorios para venta',             'accesorio',   true),
  ('Equipos usados / reacondicionados', 'equipo_usado',true),
  ('Insumos internos',                  'insumo',      false),
  ('Cables y cargadores',               'accesorio',   true),
  ('Protectores y fundas',              'accesorio',   true),
  ('Herramientas taller',               'insumo',      false)
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- 7. POLÍTICAS RLS PARA supervisor_ventas
-- ============================================================

-- Clientes
DROP POLICY IF EXISTS "customers_write" ON customers;
CREATE POLICY "customers_write" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));

-- Órdenes de trabajo (lectura)
DROP POLICY IF EXISTS "ot_vendedor" ON repair_orders;
CREATE POLICY "ot_vendedor" ON repair_orders FOR SELECT TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- Órdenes de trabajo (creación)
DROP POLICY IF EXISTS "ot_vendedor_write" ON repair_orders;
CREATE POLICY "ot_vendedor_write" ON repair_orders FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- Ventas
DROP POLICY IF EXISTS "sales_vendedor" ON sales;
CREATE POLICY "sales_vendedor" ON sales FOR ALL TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- Órdenes de compra (solo lectura para supervisor)
DROP POLICY IF EXISTS "po_supervisor_read" ON purchase_orders;
CREATE POLICY "po_supervisor_read" ON purchase_orders FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');

DROP POLICY IF EXISTS "po_items_supervisor_read" ON purchase_order_items;
CREATE POLICY "po_items_supervisor_read" ON purchase_order_items FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');

-- Cierres de caja
DROP POLICY IF EXISTS "cash_read" ON cash_closings;
CREATE POLICY "cash_read" ON cash_closings FOR SELECT TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));


-- ============================================================
-- VERIFICACIÓN — Debe mostrar resultados en cada SELECT
-- ============================================================

SELECT 'user_profiles.permisos_modulos' AS check,
       column_name IS NOT NULL AS ok
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'permisos_modulos';

SELECT 'system_config.costo_insumos_promedio' AS check,
       column_name IS NOT NULL AS ok
FROM information_schema.columns
WHERE table_name = 'system_config' AND column_name = 'costo_insumos_promedio';

SELECT 'roles' AS check, nombre FROM roles ORDER BY nombre;

SELECT 'product_categories' AS check, nombre FROM product_categories ORDER BY nombre;

SELECT 'audit_logs' AS check, COUNT(*) AS registros FROM audit_logs;
