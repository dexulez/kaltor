ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS pago_en_revision BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metodo_pago_reportado TEXT,
  ADD COLUMN IF NOT EXISTS nota_pago_comprador TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento_solicitado TEXT CHECK (tipo_documento_solicitado IN ('boleta','factura')) DEFAULT 'boleta',
  ADD COLUMN IF NOT EXISTS rut_facturacion TEXT,
  ADD COLUMN IF NOT EXISTS razon_social_facturacion TEXT;
