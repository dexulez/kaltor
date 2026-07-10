-- ============================================================
-- Kaltor: precio de referencia en USD para los planes
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- El superadmin edita precio_mensual_usd desde kaltor-admin → Planes.
-- precio_mensual / precio_anual (CLP) se recalculan automáticamente
-- al guardar, usando el tipo de cambio vigente (mindicador.cl), y
-- son los que ve/paga el cliente en Chile. Los visitantes de otros
-- países ven el precio convertido desde el CLP resultante (ya
-- sincronizado con el USD) a su moneda local en el landing.
-- ============================================================

ALTER TABLE plans ADD COLUMN IF NOT EXISTS precio_mensual_usd NUMERIC(10,2);

-- Backfill inicial: aproxima el USD a partir del CLP existente (tipo de cambio ~950)
UPDATE plans SET precio_mensual_usd = ROUND((precio_mensual / 950.0)::numeric, 2)
WHERE precio_mensual_usd IS NULL;

ALTER TABLE plans ALTER COLUMN precio_mensual_usd SET NOT NULL;

-- Verificación
SELECT nombre, slug, precio_mensual, precio_anual, precio_mensual_usd
FROM plans
ORDER BY precio_mensual;
