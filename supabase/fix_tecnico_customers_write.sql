-- Permite al técnico crear y editar clientes (cuando se le otorga el permiso en la app)
DROP POLICY IF EXISTS "customers_write" ON customers;
CREATE POLICY "customers_write" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas', 'tecnico'))
  WITH CHECK (get_user_role() IN ('administrador', 'vendedor', 'supervisor_ventas', 'tecnico'));
