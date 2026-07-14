-- ============================================================
-- Kaltor: precios manuales por país para los planes
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- precios_pais guarda, por plan, un mapa { "BR": 99.90, "MX": 349, ... }
-- con el precio mensual real en la moneda local de cada país (excepto
-- Chile, que usa precio_mensual en CLP, y los países dolarizados, que
-- usan precio_mensual_usd directamente). El superadmin lo edita desde
-- kaltor-admin → Planes; cada vez que guarda un nuevo precio_mensual_usd,
-- estos valores se recalculan automáticamente desde ese USD y luego
-- puede ajustarlos manualmente país por país.
-- ============================================================

ALTER TABLE plans ADD COLUMN IF NOT EXISTS precios_pais JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Verificación
SELECT nombre, slug, precio_mensual, precio_mensual_usd, precios_pais
FROM plans
ORDER BY precio_mensual;
