-- ═══════════════════════════════════════════════════════════════════════════
-- Diagnóstico y corrección de permisos para usuarios administradores
-- Caso: nancyb no ve todos los módulos
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Diagnóstico: ver estado actual de Nancy ───────────────────────────
SELECT
  up.id,
  up.email,
  up.nombre_completo,
  r.nombre                AS rol_nombre,
  up.rol_id,
  up.store_id,
  up.activo,
  up.permisos_modulos
FROM user_profiles up
LEFT JOIN roles r ON r.id = up.rol_id
WHERE up.email ILIKE '%nancy%'
   OR up.nombre_completo ILIKE '%nancy%';

-- ─── 2. Ver los módulos activos de la tienda de Nancy ────────────────────
SELECT sm.module_key, sm.activo
FROM store_modules sm
JOIN user_profiles up ON up.store_id = sm.store_id
WHERE (up.email ILIKE '%nancy%' OR up.nombre_completo ILIKE '%nancy%')
ORDER BY sm.module_key;

-- ─── 3. Corrección: resetear permisos_modulos a NULL ─────────────────────
-- Para usuarios administrador, el sistema ya ignora permisos_modulos en el
-- código (tieneAccesoModulo retorna true para admin). Al poner NULL se
-- garantiza que no haya valores residuales que puedan interferir.
UPDATE user_profiles
SET permisos_modulos = NULL
WHERE rol_id IN (
  SELECT id FROM roles WHERE nombre = 'administrador'
)
AND (
  email ILIKE '%nancy%'
  OR nombre_completo ILIKE '%nancy%'
);

-- ─── 4. Asegurar que todos los módulos están activos en la tienda ─────────
-- Ejecutar solo si la tienda de Nancy no tiene todos los módulos activos.
-- Esto activa los 9 módulos de negocio + configuracion para la tienda de Nancy.
INSERT INTO store_modules (store_id, module_key, activo)
SELECT up.store_id, m.key, true
FROM user_profiles up
CROSS JOIN (VALUES
  ('ventas'), ('compras'), ('productos'), ('servicios'),
  ('taller'), ('informes'), ('contabilidad'), ('configuracion'), ('canal_b2b')
) AS m(key)
WHERE (up.email ILIKE '%nancy%' OR up.nombre_completo ILIKE '%nancy%')
  AND up.store_id IS NOT NULL
ON CONFLICT (store_id, module_key) DO UPDATE SET activo = true;

-- ─── 5. Verificación final ────────────────────────────────────────────────
SELECT
  up.email,
  up.nombre_completo,
  r.nombre AS rol,
  up.permisos_modulos,
  (
    SELECT json_agg(sm.module_key ORDER BY sm.module_key)
    FROM store_modules sm
    WHERE sm.store_id = up.store_id AND sm.activo = true
  ) AS modulos_tienda
FROM user_profiles up
LEFT JOIN roles r ON r.id = up.rol_id
WHERE up.email ILIKE '%nancy%' OR up.nombre_completo ILIKE '%nancy%';
