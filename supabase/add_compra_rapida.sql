-- Compra directa (sin pasar por todo el flujo de OC) + tipo de documento en gastos.

-- Tipo de documento de la OC (boleta/factura). Por defecto factura para no romper
-- las OC existentes que usan numero_factura_proveedor.
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'factura';

-- Proveedor genérico para compras ocasionales sin proveedor formal registrado
-- (supplier_id es NOT NULL en purchase_orders).
INSERT INTO suppliers (nombre, condicion_pago)
SELECT 'Varios / Compra ocasional', 'contado'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE nombre = 'Varios / Compra ocasional');

-- Tipo y número de documento en gastos (boleta/factura/sin documento)
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS numero_documento TEXT;
