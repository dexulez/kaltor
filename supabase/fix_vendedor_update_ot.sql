-- FIX: vendedor/supervisor_ventas no podían actualizar repair_orders
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- Solo existían políticas de SELECT ("ot_vendedor") e INSERT ("ot_vendedor_write")
-- para estos roles. Al no existir una política de UPDATE, cualquier .update()
-- de un vendedor/supervisor de ventas sobre repair_orders se ejecutaba "sin error"
-- pero afectaba 0 filas (RLS la descarta silenciosamente) — por eso el cambio de
-- estado parecía guardarse (queda registrado en repair_status_history, que sí
-- permite insertar) pero el estado real de la OT nunca cambiaba.

DROP POLICY IF EXISTS "ot_vendedor_update" ON repair_orders;
CREATE POLICY "ot_vendedor_update" ON repair_orders FOR UPDATE TO authenticated
  USING (get_user_role() IN ('vendedor', 'supervisor_ventas'));
