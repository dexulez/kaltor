-- Permite al técnico crear nuevas OTs
CREATE POLICY "ot_tecnico_insert" ON repair_orders FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'tecnico');

-- También permitir al técnico ver TODAS las OTs que él crea (no solo las asignadas)
-- Opcional: si quieres que el técnico vea OTs sin asignar para adjudicárselas
-- La política ot_tecnico ya cubre las OTs asignadas (tecnico_id = auth.uid())
