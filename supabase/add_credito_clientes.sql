-- ============================================================
-- Crédito a clientes (fiado / cuentas por cobrar)
-- Ejecutar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

BEGIN;

-- 1. Campos de crédito en customers (mismo patrón que suppliers.saldo_deudor,
--    pero en dirección inversa: lo que el cliente le debe a la tienda)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS permite_credito BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS saldo_deudor DECIMAL(12,2) NOT NULL DEFAULT 0;

-- 2. Permitir 'fiado' como método de pago en ventas y OTs
--    (no reemplaza 'credito', que significa tarjeta de crédito bancaria)
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_metodo_pago_check;
ALTER TABLE sales ADD CONSTRAINT sales_metodo_pago_check
  CHECK (metodo_pago IN ('efectivo', 'transferencia', 'debito', 'credito', 'fiado'));

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_metodo_pago_2_check;
ALTER TABLE sales ADD CONSTRAINT sales_metodo_pago_2_check
  CHECK (metodo_pago_2 IS NULL OR metodo_pago_2 IN ('efectivo', 'transferencia', 'debito', 'credito', 'fiado'));

ALTER TABLE repair_orders DROP CONSTRAINT IF EXISTS repair_orders_metodo_pago_check;
ALTER TABLE repair_orders ADD CONSTRAINT repair_orders_metodo_pago_check
  CHECK (metodo_pago IS NULL OR metodo_pago IN ('efectivo', 'transferencia', 'debito', 'credito', 'fiado'));

-- 3. Historial de abonos del cliente a su deuda (mismo patrón que supplier_settlements)
CREATE TABLE IF NOT EXISTS customer_credit_payments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  monto       INTEGER     NOT NULL,
  metodo_pago TEXT        NOT NULL DEFAULT 'efectivo',
  nota        TEXT,
  fecha       DATE        NOT NULL DEFAULT CURRENT_DATE,
  usuario_id  UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  store_id    UUID        REFERENCES stores(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_customer ON customer_credit_payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_fecha ON customer_credit_payments (fecha);

-- 4. Multi-tenant: trigger de store_id + RLS kaltor_v1
DROP TRIGGER IF EXISTS trig_store_id_customer_credit_payments ON customer_credit_payments;
CREATE TRIGGER trig_store_id_customer_credit_payments
BEFORE INSERT ON customer_credit_payments
FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

ALTER TABLE customer_credit_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customer_credit_payments' AND policyname = 'kaltor_v1'
  ) THEN
    CREATE POLICY kaltor_v1 ON customer_credit_payments
      FOR ALL TO authenticated
      USING (store_id = get_current_store_id())
      WITH CHECK (store_id = get_current_store_id());
  END IF;
END;
$$;

COMMIT;

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'
  AND column_name IN ('permite_credito', 'limite_credito', 'saldo_deudor');

SELECT COUNT(*) AS filas_customer_credit_payments FROM customer_credit_payments;
