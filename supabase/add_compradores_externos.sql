-- ============================================================
-- MÓDULO B2B: compradores externos (otros talleres/técnicos)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Rol nuevo ─────────────────────────────────────────────
INSERT INTO roles (nombre, descripcion, es_sistema)
VALUES ('comprador_externo', 'Cliente externo (otro taller) con acceso solo al catálogo B2B', true)
ON CONFLICT (nombre) DO NOTHING;

-- ── 2. Columnas nuevas ───────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS precio_mayorista DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS visible_compradores BOOLEAN DEFAULT FALSE;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- ── 3. Tablas: pedidos B2B (espejo de purchase_orders) ───────
CREATE TABLE IF NOT EXISTS sales_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido    TEXT NOT NULL UNIQUE,
  comprador_id     UUID NOT NULL REFERENCES user_profiles(id),
  estado           TEXT NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'confirmado', 'rechazado', 'cancelado')),
  total_estimado   DECIMAL(12,2) DEFAULT 0,
  sale_id          UUID REFERENCES sales(id),
  motivo_rechazo   TEXT,
  confirmado_por   UUID REFERENCES user_profiles(id),
  confirmado_at    TIMESTAMPTZ,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id       UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id),
  nombre               TEXT NOT NULL,
  cantidad_solicitada  INTEGER NOT NULL,
  cantidad_confirmada  INTEGER,
  precio_unitario      DECIMAL(12,2) NOT NULL,
  subtotal             DECIMAL(12,2) NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_comprador ON sales_orders (comprador_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_estado ON sales_orders (estado);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_orden ON sales_order_items (sales_order_id);

-- Numeración automática PV-000001, PV-000002...
CREATE SEQUENCE IF NOT EXISTS sales_order_seq START 1;

CREATE OR REPLACE FUNCTION generate_pv_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_pedido := 'PV-' || LPAD(nextval('sales_order_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pv_number ON sales_orders;
CREATE TRIGGER set_pv_number
BEFORE INSERT ON sales_orders
FOR EACH ROW EXECUTE FUNCTION generate_pv_number();

DROP TRIGGER IF EXISTS update_sales_orders_updated_at ON sales_orders;
CREATE TRIGGER update_sales_orders_updated_at
BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. RLS — tablas nuevas
-- ============================================================
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_orders_admin" ON sales_orders FOR ALL TO authenticated
  USING (is_admin());
CREATE POLICY "sales_orders_staff_ventas" ON sales_orders FOR ALL TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));
CREATE POLICY "sales_orders_comprador_select" ON sales_orders FOR SELECT TO authenticated
  USING (comprador_id = auth.uid());
CREATE POLICY "sales_orders_comprador_insert" ON sales_orders FOR INSERT TO authenticated
  WITH CHECK (comprador_id = auth.uid());

CREATE POLICY "sales_order_items_admin" ON sales_order_items FOR ALL TO authenticated
  USING (is_admin());
CREATE POLICY "sales_order_items_staff_ventas" ON sales_order_items FOR ALL TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));
CREATE POLICY "sales_order_items_comprador_select" ON sales_order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales_orders so
    WHERE so.id = sales_order_items.sales_order_id AND so.comprador_id = auth.uid()
  ));
CREATE POLICY "sales_order_items_comprador_insert" ON sales_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales_orders so
    WHERE so.id = sales_order_items.sales_order_id
      AND so.comprador_id = auth.uid()
      AND so.estado = 'pendiente'
  ));

-- ============================================================
-- 5. RLS — accesos angostos para comprador_externo en tablas existentes
-- ============================================================

-- Catálogo: solo productos marcados como visibles para compradores
CREATE POLICY "products_comprador_select" ON products FOR SELECT TO authenticated
  USING (get_user_role() = 'comprador_externo' AND visible_compradores = true);

-- Su propia ficha de cliente (vinculada en user_profiles.customer_id)
CREATE POLICY "customers_comprador_select" ON customers FOR SELECT TO authenticated
  USING (
    get_user_role() = 'comprador_externo'
    AND id = (SELECT customer_id FROM user_profiles WHERE id = auth.uid())
  );

-- Solo lectura de las ventas/items que resultaron de sus propios pedidos confirmados
CREATE POLICY "sales_comprador_select" ON sales FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales_orders so WHERE so.sale_id = sales.id AND so.comprador_id = auth.uid()
  ));
CREATE POLICY "sale_items_comprador_select" ON sale_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales_orders so WHERE so.sale_id = sale_items.sale_id AND so.comprador_id = auth.uid()
  ));

-- ============================================================
-- 6. RLS — bloquear comprador_externo en tablas internas sensibles
-- Estas tablas tienen políticas "USING (true)" o "FOR ALL ... USING (true)"
-- pensadas para personal de confianza. Las políticas RESTRICTIVE se combinan
-- con AND sobre las permisivas existentes, así que esto cierra el acceso sin
-- tocar el comportamiento de los demás roles.
-- ============================================================

DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'system_config', 'equipment', 'repair_status_history', 'repair_items',
    'stock_movements', 'suppliers', 'repair_services', 'repair_service_items',
    'repair_deposits', 'repair_order_services', 'gastos_extras', 'gastos_fijos',
    'empleados_taller', 'sesiones_caja', 'arqueos_caja', 'supplier_settlements'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "deny_comprador_externo" ON %I', t);
      EXECUTE format(
        'CREATE POLICY "deny_comprador_externo" ON %I AS RESTRICTIVE FOR ALL TO authenticated USING (get_user_role() <> ''comprador_externo'')',
        t
      );
    END IF;
  END LOOP;
END $$;

-- products y customers: también necesitan la restrictive (la angosta de arriba
-- es PERMISSIVE y se suma con OR a "products_read"/"customers_read"; falta la
-- RESTRICTIVE para que ese OR no termine exponiendo todo a comprador_externo).
DROP POLICY IF EXISTS "deny_comprador_externo" ON products;
CREATE POLICY "deny_comprador_externo" ON products AS RESTRICTIVE FOR ALL TO authenticated
  USING (get_user_role() <> 'comprador_externo' OR visible_compradores = true);

DROP POLICY IF EXISTS "deny_comprador_externo" ON customers;
CREATE POLICY "deny_comprador_externo" ON customers AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    get_user_role() <> 'comprador_externo'
    OR id = (SELECT customer_id FROM user_profiles WHERE id = auth.uid())
  );

-- sale_items tiene "sale_items_all" FOR ALL USING(true) — angosto + restrictive
DROP POLICY IF EXISTS "deny_comprador_externo" ON sale_items;
CREATE POLICY "deny_comprador_externo" ON sale_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    get_user_role() <> 'comprador_externo'
    OR EXISTS (SELECT 1 FROM sales_orders so WHERE so.sale_id = sale_items.sale_id AND so.comprador_id = auth.uid())
  );

-- notifications: tabla no rastreada en migraciones (creada manualmente en Supabase).
-- Aseguramos RLS encendido y bloqueamos el acceso de comprador_externo por completo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    EXECUTE 'ALTER TABLE notifications ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "deny_comprador_externo" ON notifications';
    EXECUTE 'CREATE POLICY "deny_comprador_externo" ON notifications AS RESTRICTIVE FOR ALL TO authenticated USING (get_user_role() <> ''comprador_externo'')';
  END IF;
END $$;
