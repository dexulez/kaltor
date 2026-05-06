-- ============================================================
-- TECHREPAIR PRO — Esquema completo de base de datos
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ROLES Y PERFILES DE USUARIO
-- ============================================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  permisos JSONB NOT NULL DEFAULT '{}',
  es_sistema BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  rol_id UUID REFERENCES roles(id),
  comision_base DECIMAL(5,2) DEFAULT 0,
  comision_pantalla DECIMAL(5,2) DEFAULT 0,
  comision_bateria DECIMAL(5,2) DEFAULT 0,
  comision_placa DECIMAL(5,2) DEFAULT 0,
  comision_software DECIMAL(5,2) DEFAULT 0,
  comision_camara DECIMAL(5,2) DEFAULT 0,
  comision_conector DECIMAL(5,2) DEFAULT 0,
  comision_otro DECIMAL(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles base del sistema
INSERT INTO roles (nombre, descripcion, es_sistema, permisos) VALUES
('administrador', 'Acceso total al sistema', true, '{
  "dashboard": "completo",
  "clientes": "completo",
  "recepcion": "completo",
  "reparaciones": "completo",
  "caja": "completo",
  "inventario": "completo",
  "compras": "completo",
  "usuarios": "completo",
  "informes": "completo",
  "configuracion": "completo",
  "creditos_proveedores": "completo"
}'),
('tecnico', 'Gestiona reparaciones asignadas', true, '{
  "dashboard": "propio",
  "clientes": "lectura",
  "recepcion": "completo",
  "reparaciones": "asignadas",
  "caja": "ninguno",
  "inventario": "lectura",
  "compras": "ninguno",
  "usuarios": "ninguno",
  "informes": "propio",
  "configuracion": "ninguno",
  "creditos_proveedores": "ninguno"
}'),
('vendedor', 'Gestiona caja y ventas', true, '{
  "dashboard": "ventas",
  "clientes": "completo",
  "recepcion": "completo",
  "reparaciones": "lectura",
  "caja": "completo",
  "inventario": "lectura",
  "compras": "ninguno",
  "usuarios": "ninguno",
  "informes": "ventas",
  "configuracion": "ninguno",
  "creditos_proveedores": "ninguno"
}'),
('supervisor_ventas', 'Supervisa el equipo de ventas, acceso completo a caja e informes, lectura de compras', true, '{
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
}');

-- ============================================================
-- CONFIGURACIÓN DEL SISTEMA
-- ============================================================

CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_local TEXT NOT NULL DEFAULT 'TechRepair Pro',
  rut_local TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  whatsapp TEXT,
  logo_url TEXT,
  iva DECIMAL(5,2) DEFAULT 19.00,
  ppm DECIMAL(5,2) DEFAULT 3.00,
  comision_debito DECIMAL(5,2) DEFAULT 1.50,
  comision_credito DECIMAL(5,2) DEFAULT 2.50,
  comision_transferencia DECIMAL(5,2) DEFAULT 0.00,
  dias_garantia_default INTEGER DEFAULT 30,
  moneda TEXT DEFAULT 'CLP',
  mostrar_precio_en_presupuesto BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_config (nombre_local) VALUES ('TechRepair Pro');

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  rut TEXT,
  direccion TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_telefono ON customers(telefono);
CREATE INDEX idx_customers_rut ON customers(rut);
CREATE INDEX idx_customers_nombre ON customers(nombre);

-- ============================================================
-- EQUIPOS
-- ============================================================

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  imei TEXT,
  color TEXT,
  capacidad TEXT,
  accesorios JSONB DEFAULT '[]',
  condicion_visual JSONB DEFAULT '[]',
  observaciones TEXT,
  falla_reportada TEXT NOT NULL,
  fotos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_equipment_imei ON equipment(imei) WHERE imei IS NOT NULL AND imei != '';
CREATE INDEX idx_equipment_customer ON equipment(customer_id);

-- ============================================================
-- ÓRDENES DE REPARACIÓN
-- ============================================================

CREATE TYPE repair_status AS ENUM (
  'recibido',
  'en_diagnostico',
  'presupuestado',
  'aprobado',
  'rechazado',
  'esperando_repuesto',
  'en_reparacion',
  'listo',
  'entregado',
  'en_garantia',
  'cancelado'
);

CREATE TYPE repair_type AS ENUM (
  'pantalla', 'bateria', 'placa', 'software', 'camara', 'conector', 'otro'
);

CREATE TABLE repair_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_ot TEXT NOT NULL UNIQUE,
  codigo_seguimiento TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 12),
  customer_id UUID NOT NULL REFERENCES customers(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  tecnico_id UUID REFERENCES user_profiles(id),
  estado repair_status NOT NULL DEFAULT 'recibido',
  tipo_reparacion repair_type,
  presupuesto_estimado DECIMAL(12,2),
  precio_servicio DECIMAL(12,2),
  diagnostico_tecnico TEXT,
  resultado TEXT CHECK (resultado IN ('exitosa', 'no_exitosa')),
  comentario_resultado TEXT,
  dias_garantia INTEGER DEFAULT 30,
  fecha_garantia_hasta TIMESTAMPTZ,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia', 'debito', 'credito')),
  iva_aplicado DECIMAL(5,2),
  ppm_aplicado DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  fecha_entrega TIMESTAMPTZ
);

CREATE SEQUENCE repair_order_seq START 1000;

CREATE OR REPLACE FUNCTION generate_ot_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_ot := 'OT-' || LPAD(nextval('repair_order_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ot_number
BEFORE INSERT ON repair_orders
FOR EACH ROW EXECUTE FUNCTION generate_ot_number();

CREATE INDEX idx_repair_orders_customer ON repair_orders(customer_id);
CREATE INDEX idx_repair_orders_tecnico ON repair_orders(tecnico_id);
CREATE INDEX idx_repair_orders_estado ON repair_orders(estado);
CREATE INDEX idx_repair_orders_codigo ON repair_orders(codigo_seguimiento);

-- Historial de estados
CREATE TABLE repair_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  estado_anterior repair_status,
  estado_nuevo repair_status NOT NULL,
  comentario TEXT,
  usuario_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_history_ot ON repair_status_history(repair_order_id);

-- ============================================================
-- INVENTARIO / PRODUCTOS
-- ============================================================

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('repuesto', 'accesorio', 'equipo_usado', 'insumo')),
  vendible BOOLEAN DEFAULT true,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO product_categories (nombre, tipo, vendible) VALUES
('Repuestos', 'repuesto', true),
('Accesorios para venta', 'accesorio', true),
('Equipos usados / reacondicionados', 'equipo_usado', true),
('Insumos internos', 'insumo', false);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  razon_social TEXT,
  rut TEXT,
  contacto_nombre TEXT,
  telefono TEXT,
  email TEXT,
  whatsapp TEXT,
  pais TEXT DEFAULT 'Chile',
  ciudad TEXT,
  direccion TEXT,
  condicion_pago TEXT CHECK (condicion_pago IN ('contado', 'credito', 'cuotas')) DEFAULT 'contado',
  plazo_pago_dias INTEGER DEFAULT 0,
  saldo_deudor DECIMAL(12,2) DEFAULT 0,
  calificacion DECIMAL(3,1),
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id UUID NOT NULL REFERENCES product_categories(id),
  proveedor_id UUID REFERENCES suppliers(id),
  compatibilidad JSONB DEFAULT '[]',
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  precio_costo DECIMAL(12,2) DEFAULT 0,
  costo_envio DECIMAL(12,2) DEFAULT 0,
  precio_venta DECIMAL(12,2) DEFAULT 0,
  precio_incluye_iva BOOLEAN DEFAULT true,
  ubicacion_bodega TEXT,
  numero_serie TEXT,
  imei TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stock_no_negativo CHECK (stock_actual >= 0)
);

CREATE OR REPLACE FUNCTION generate_sku()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'SKU-' || UPPER(substring(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sku
BEFORE INSERT ON products
FOR EACH ROW EXECUTE FUNCTION generate_sku();

CREATE INDEX idx_products_categoria ON products(categoria_id);
CREATE INDEX idx_products_proveedor ON products(proveedor_id);
CREATE INDEX idx_products_stock ON products(stock_actual) WHERE stock_actual <= stock_minimo;

-- Movimientos de inventario
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  razon TEXT NOT NULL,
  referencia_id UUID,
  referencia_tipo TEXT,
  usuario_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

-- Repuestos usados en reparación
CREATE TABLE repair_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_costo DECIMAL(12,2) DEFAULT 0,
  costo_envio DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_repair_items_ot ON repair_items(repair_order_id);

-- ============================================================
-- VENTAS / CAJA
-- ============================================================

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_venta TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('reparacion', 'directa')),
  repair_order_id UUID REFERENCES repair_orders(id),
  customer_id UUID REFERENCES customers(id),
  subtotal DECIMAL(12,2) NOT NULL,
  iva DECIMAL(12,2) DEFAULT 0,
  ppm DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia', 'debito', 'credito')),
  comision_bancaria DECIMAL(12,2) DEFAULT 0,
  tipo_documento TEXT CHECK (tipo_documento IN ('boleta', 'factura')) DEFAULT 'boleta',
  rut_receptor TEXT,
  razon_social_receptor TEXT,
  usuario_id UUID REFERENCES user_profiles(id),
  anulada BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE sale_seq START 1;

CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_venta := 'V-' || LPAD(nextval('sale_seq')::TEXT, 8, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sale_number
BEFORE INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION generate_sale_number();

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_fecha ON sales(created_at);
CREATE INDEX idx_sales_tipo ON sales(tipo);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12,2) NOT NULL,
  precio_costo DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- Cierres de caja
CREATE TABLE cash_closings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL UNIQUE,
  total_efectivo DECIMAL(12,2) DEFAULT 0,
  total_transferencia DECIMAL(12,2) DEFAULT 0,
  total_debito DECIMAL(12,2) DEFAULT 0,
  total_credito DECIMAL(12,2) DEFAULT 0,
  total_ventas DECIMAL(12,2) DEFAULT 0,
  total_iva DECIMAL(12,2) DEFAULT 0,
  total_ppm DECIMAL(12,2) DEFAULT 0,
  total_neto DECIMAL(12,2) DEFAULT 0,
  cantidad_transacciones INTEGER DEFAULT 0,
  usuario_id UUID REFERENCES user_profiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMISIONES DE TÉCNICOS
-- ============================================================

CREATE TABLE technician_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_order_id UUID NOT NULL REFERENCES repair_orders(id),
  tecnico_id UUID NOT NULL REFERENCES user_profiles(id),
  precio_servicio DECIMAL(12,2) NOT NULL,
  costo_repuestos DECIMAL(12,2) DEFAULT 0,
  base_calculo DECIMAL(12,2) NOT NULL,
  porcentaje_base DECIMAL(5,2) NOT NULL,
  porcentaje_tipo DECIMAL(5,2) DEFAULT 0,
  descuento_metodo_pago DECIMAL(5,2) DEFAULT 0,
  comision_bruta DECIMAL(12,2) NOT NULL,
  comision_neta DECIMAL(12,2) NOT NULL,
  pagada BOOLEAN DEFAULT false,
  fecha_pago TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_tecnico ON technician_commissions(tecnico_id);
CREATE INDEX idx_commissions_ot ON technician_commissions(repair_order_id);

-- ============================================================
-- COMPRAS Y PROVEEDORES
-- ============================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_oc TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'en_transito', 'recibida_parcial', 'recibida_completa', 'cancelada')) DEFAULT 'pendiente',
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia', 'credito')),
  costo_envio_total DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  fecha_estimada_llegada DATE,
  fecha_recepcion TIMESTAMPTZ,
  notas TEXT,
  usuario_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE purchase_order_seq START 1;

CREATE OR REPLACE FUNCTION generate_oc_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_oc := 'OC-' || LPAD(nextval('purchase_order_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_oc_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION generate_oc_number();

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  nombre TEXT NOT NULL,
  cantidad_solicitada INTEGER NOT NULL,
  cantidad_recibida INTEGER DEFAULT 0,
  precio_unitario DECIMAL(12,2) NOT NULL,
  costo_envio_prorrateado DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créditos con proveedores
CREATE TABLE supplier_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('deuda', 'abono')),
  monto DECIMAL(12,2) NOT NULL,
  metodo_pago TEXT,
  referencia TEXT,
  fecha_vencimiento DATE,
  notas TEXT,
  usuario_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_credits_supplier ON supplier_credits(supplier_id);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================

CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN ('email', 'whatsapp')),
  destinatario TEXT NOT NULL,
  asunto TEXT,
  mensaje TEXT NOT NULL,
  repair_order_id UUID REFERENCES repair_orders(id),
  estado TEXT CHECK (estado IN ('enviado', 'fallido', 'pendiente')) DEFAULT 'pendiente',
  error_detalle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT r.nombre FROM user_profiles up
  JOIN roles r ON r.id = up.rol_id
  WHERE up.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Función helper para verificar si es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'administrador'
$$ LANGUAGE sql SECURITY DEFINER;

-- Roles: todos autenticados pueden leer
CREATE POLICY "roles_read" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin" ON roles FOR ALL TO authenticated USING (is_admin());

-- system_config: todos leen, solo admin modifica
CREATE POLICY "config_read" ON system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_admin" ON system_config FOR ALL TO authenticated USING (is_admin());

-- user_profiles: cada uno ve el suyo, admin ve todos
CREATE POLICY "profiles_own" ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_admin" ON user_profiles FOR ALL TO authenticated USING (is_admin());

-- customers: vendedor, supervisor y admin tienen acceso completo, técnico solo lectura
CREATE POLICY "customers_read" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_write" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));

-- equipment: todos autenticados pueden leer y crear
CREATE POLICY "equipment_all" ON equipment FOR ALL TO authenticated USING (true);

-- repair_orders: admin ve todas, técnico solo las suyas, vendedor y supervisor pueden leer todas
CREATE POLICY "ot_admin" ON repair_orders FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "ot_tecnico" ON repair_orders FOR SELECT TO authenticated
  USING (get_user_role() = 'tecnico' AND tecnico_id = auth.uid());
CREATE POLICY "ot_tecnico_update" ON repair_orders FOR UPDATE TO authenticated
  USING (get_user_role() = 'tecnico' AND tecnico_id = auth.uid());
CREATE POLICY "ot_vendedor" ON repair_orders FOR SELECT TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));
CREATE POLICY "ot_vendedor_write" ON repair_orders FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('vendedor', 'supervisor_ventas'));

-- repair_status_history: todos pueden leer, autenticados insertar
CREATE POLICY "history_read" ON repair_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert" ON repair_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- repair_items: todos autenticados
CREATE POLICY "repair_items_all" ON repair_items FOR ALL TO authenticated USING (true);

-- product_categories: todos leen, admin/vendedor/supervisor gestionan
CREATE POLICY "product_categories_read" ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_categories_write" ON product_categories FOR ALL TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'))
  WITH CHECK (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));

-- products: todos leen, admin y técnico (con restricción) modifican
CREATE POLICY "products_read" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_admin" ON products FOR ALL TO authenticated USING (is_admin());

-- stock_movements: todos leen, sistema escribe
CREATE POLICY "stock_read" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_write" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);

-- sales: admin, vendedor y supervisor
CREATE POLICY "sales_admin" ON sales FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "sales_vendedor" ON sales FOR ALL TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));
CREATE POLICY "sales_tecnico_read" ON sales FOR SELECT TO authenticated
  USING (get_user_role() = 'tecnico');

-- sale_items
CREATE POLICY "sale_items_all" ON sale_items FOR ALL TO authenticated USING (true);

-- commissions: técnico ve las suyas, admin ve todas
CREATE POLICY "commissions_own" ON technician_commissions FOR SELECT TO authenticated
  USING (tecnico_id = auth.uid() OR is_admin());
CREATE POLICY "commissions_admin" ON technician_commissions FOR ALL TO authenticated USING (is_admin());

-- suppliers: admin y vendedor (compras solo admin)
CREATE POLICY "suppliers_read" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_admin" ON suppliers FOR ALL TO authenticated USING (is_admin());

-- purchase_orders y items: admin modifica, supervisor solo lectura
CREATE POLICY "po_admin" ON purchase_orders FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "po_supervisor_read" ON purchase_orders FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');
CREATE POLICY "po_items_admin" ON purchase_order_items FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "po_items_supervisor_read" ON purchase_order_items FOR SELECT TO authenticated
  USING (get_user_role() = 'supervisor_ventas');

-- supplier_credits: solo admin
CREATE POLICY "credits_admin" ON supplier_credits FOR ALL TO authenticated USING (is_admin());

-- notifications_log: solo admin
CREATE POLICY "notif_admin" ON notifications_log FOR ALL TO authenticated USING (is_admin());

-- cash_closings: admin, vendedor y supervisor
CREATE POLICY "cash_read" ON cash_closings FOR SELECT TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas'));
CREATE POLICY "cash_admin" ON cash_closings FOR ALL TO authenticated USING (is_admin());

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_repair_orders_updated_at BEFORE UPDATE ON repair_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: crear perfil al registrar usuario
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE nombre = 'administrador' LIMIT 1;

  INSERT INTO user_profiles (id, nombre_completo, email, rol_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    NEW.email,
    CASE WHEN NOT EXISTS (SELECT 1 FROM user_profiles) THEN admin_role_id ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Portal público de seguimiento: acceso sin autenticación
CREATE POLICY "ot_public_seguimiento" ON repair_orders FOR SELECT
  USING (true);

CREATE POLICY "history_public" ON repair_status_history FOR SELECT
  USING (true);
