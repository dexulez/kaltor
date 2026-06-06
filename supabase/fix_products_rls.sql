-- ═══════════════════════════════════════════════════════════════════
-- FIX 1: Ampliar política de escritura en products
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "products_admin" ON products;

CREATE POLICY "products_write" ON products
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IS NOT NULL);

CREATE POLICY "products_update" ON products
  FOR UPDATE TO authenticated
  USING (get_user_role() IS NOT NULL)
  WITH CHECK (get_user_role() IS NOT NULL);

CREATE POLICY "products_delete" ON products
  FOR DELETE TO authenticated
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- FIX 2: Permitir a técnicos adjudicarse OTs sin técnico asignado
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "ot_tecnico_update" ON repair_orders;

-- Técnico puede actualizar sus propias OTs O adjudicarse una sin técnico
CREATE POLICY "ot_tecnico_update" ON repair_orders
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'tecnico'
    AND (tecnico_id = auth.uid() OR tecnico_id IS NULL)
  )
  WITH CHECK (
    get_user_role() = 'tecnico'
    AND (tecnico_id = auth.uid() OR tecnico_id IS NULL)
  );

-- Verificar:
-- SELECT get_user_role(), is_admin();
