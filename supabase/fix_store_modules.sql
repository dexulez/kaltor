-- Fix: repoblar store_modules para todas las tiendas según su plan.
-- Para tiendas cuyo plan no tiene módulos en plan_modules, se insertan TODOS.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor

DO $$
DECLARE
  r RECORD;
  v_mod_count INT;
BEGIN
  FOR r IN SELECT id, nombre, plan_id FROM stores LOOP
    -- ¿Cuántos módulos tiene su plan en plan_modules?
    SELECT COUNT(*) INTO v_mod_count
    FROM plan_modules WHERE plan_id = r.plan_id;

    -- Limpiar módulos actuales de esta tienda
    DELETE FROM store_modules WHERE store_id = r.id;

    IF v_mod_count > 0 THEN
      -- Insertar los módulos definidos en plan_modules para su plan
      INSERT INTO store_modules (store_id, module_key, activo)
      SELECT r.id, module_key, true
      FROM plan_modules
      WHERE plan_id = r.plan_id;

      RAISE NOTICE 'Tienda "%": % módulos del plan', r.nombre, v_mod_count;
    ELSE
      -- Plan sin módulos configurados → dar acceso a todos los módulos
      INSERT INTO store_modules (store_id, module_key, activo) VALUES
        (r.id, 'dashboard',     true),
        (r.id, 'clientes',      true),
        (r.id, 'reparaciones',  true),
        (r.id, 'inventario',    true),
        (r.id, 'caja',          true),
        (r.id, 'compras',       true),
        (r.id, 'usuarios',      true),
        (r.id, 'informes',      true),
        (r.id, 'contabilidad',  true),
        (r.id, 'servicios',     true),
        (r.id, 'manuales',      true),
        (r.id, 'configuracion', true),
        (r.id, 'catalogo_b2b',  true),
        (r.id, 'pedidos_b2b',   true),
        (r.id, 'notificaciones',true);

      RAISE NOTICE 'Tienda "%": plan sin módulos configurados → acceso completo otorgado', r.nombre;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Fix completado para todas las tiendas';
END $$;
