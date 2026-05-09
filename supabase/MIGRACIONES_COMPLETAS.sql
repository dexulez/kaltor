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

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_read" ON product_categories;
CREATE POLICY "product_categories_read" ON product_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "product_categories_write" ON product_categories;
CREATE POLICY "product_categories_write" ON product_categories
  FOR ALL TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'))
  WITH CHECK (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));


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

SELECT 'product_categories_policies' AS check, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'product_categories'
ORDER BY policyname;

SELECT 'audit_logs' AS check, COUNT(*) AS registros FROM audit_logs;


-- ============================================================
-- 8. COLUMNA codigo_barras EN products
--    Para registrar EAN-13, Code 128, UPC, etc. por producto
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_codigo_barras
  ON products (codigo_barras)
  WHERE codigo_barras IS NOT NULL AND codigo_barras <> '';

SELECT 'products.codigo_barras' AS check,
       column_name IS NOT NULL AS ok
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'codigo_barras';


-- ============================================================
-- 9. COMPROBANTE: descuento y cobro mixto en sales + T&C en config
-- ============================================================

-- Descuento en ventas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS descuento         INTEGER DEFAULT 0;

-- Cobro mixto (segundo método de pago)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS metodo_pago_2    TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS monto_pago_2     INTEGER DEFAULT 0;

-- Términos y condiciones en configuración del negocio
ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS terminos_condiciones TEXT;

-- Verificación
SELECT 'sales.descuento'            AS check, column_name IS NOT NULL AS ok FROM information_schema.columns WHERE table_name='sales' AND column_name='descuento';
SELECT 'sales.metodo_pago_2'        AS check, column_name IS NOT NULL AS ok FROM information_schema.columns WHERE table_name='sales' AND column_name='metodo_pago_2';
SELECT 'system_config.terminos'     AS check, column_name IS NOT NULL AS ok FROM information_schema.columns WHERE table_name='system_config' AND column_name='terminos_condiciones';

-- ============================================================
-- 10. FOTOS EN HISTORIAL OT + RESULTADO DE REPARACIÓN
-- ============================================================

-- Foto adjunta al cambiar estado
ALTER TABLE repair_status_history
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Verificación
SELECT 'repair_status_history.foto_url' AS check,
  column_name IS NOT NULL AS ok
FROM information_schema.columns
WHERE table_name = 'repair_status_history'
  AND column_name = 'foto_url';

-- ============================================================
-- 11. BASE DE CONOCIMIENTO TÉCNICO (MANUALES)
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_manuals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  marca         TEXT        NOT NULL,
  modelo        TEXT,                           -- NULL = aplica a toda la marca
  tipo          TEXT        NOT NULL DEFAULT 'falla_comun',
                                                -- falla_comun | plano | test_point | frp | herramienta | otro
  titulo        TEXT        NOT NULL,
  contenido     TEXT,                           -- Markdown libre
  archivos      TEXT[]      NOT NULL DEFAULT '{}', -- URLs Supabase Storage
  tags          TEXT[]      NOT NULL DEFAULT '{}',
  created_by    UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_manuals_marca   ON equipment_manuals (marca);
CREATE INDEX IF NOT EXISTS idx_manuals_modelo  ON equipment_manuals (modelo);
CREATE INDEX IF NOT EXISTS idx_manuals_tipo    ON equipment_manuals (tipo);

-- RLS
ALTER TABLE equipment_manuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados pueden ver manuales"
  ON equipment_manuals FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados pueden crear manuales"
  ON equipment_manuals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "creador o admin puede editar"
  ON equipment_manuals FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "creador o admin puede borrar"
  ON equipment_manuals FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Storage bucket manuales (ejecutar también en Storage UI o con este SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manuales', 'manuales', true, 52428800,  -- 50MB por archivo
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "upload manuales" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'manuales');

CREATE POLICY "view manuales" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'manuales');

CREATE POLICY "delete manuales" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'manuales');

-- Verificación
SELECT 'equipment_manuals' AS tabla,
  count(*) AS filas
FROM equipment_manuals;

-- ============================================================
-- 12. MÓDULO DE SERVICIOS (PLANTILLAS DE REPARACIÓN)
-- ============================================================

CREATE TABLE IF NOT EXISTS repair_services (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT        NOT NULL,
  descripcion         TEXT,
  tipo_reparacion     TEXT        NOT NULL DEFAULT 'otro',
  precio_base         INTEGER     NOT NULL DEFAULT 0,
  tiempo_estimado_min INTEGER     DEFAULT 60,
  activo              BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repair_service_items (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID    NOT NULL REFERENCES repair_services(id) ON DELETE CASCADE,
  product_id  UUID    REFERENCES products(id) ON DELETE SET NULL,
  nombre      TEXT    NOT NULL,
  cantidad    INTEGER NOT NULL DEFAULT 1,
  precio_costo INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE repair_services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver servicios"      ON repair_services      FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar servicios" ON repair_services     FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ver service items"  ON repair_service_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar service items" ON repair_service_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Índice
CREATE INDEX IF NOT EXISTS idx_repair_services_tipo ON repair_services (tipo_reparacion);

-- Verificación
SELECT 'repair_services' AS tabla, count(*) FROM repair_services;

-- ============================================================
-- 13. LIQUIDACIONES DE PROVEEDORES
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_settlements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  fecha       DATE        NOT NULL DEFAULT CURRENT_DATE,
  periodo_desde DATE,
  periodo_hasta DATE,
  monto       INTEGER     NOT NULL,          -- monto pagado
  metodo_pago TEXT        DEFAULT 'transferencia',
  nota        TEXT,
  created_by  UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_supplier ON supplier_settlements (supplier_id);
CREATE INDEX IF NOT EXISTS idx_settlements_fecha    ON supplier_settlements (fecha);

ALTER TABLE supplier_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestionar liquidaciones"
  ON supplier_settlements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Verificación
SELECT 'supplier_settlements' AS tabla, count(*) FROM supplier_settlements;
