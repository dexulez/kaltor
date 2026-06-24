-- "Eliminar" usuario deja de ser un borrado fisico (rompia por FKs de
-- repair_orders/sales/stock_movements/etc. que referencian user_profiles sin
-- ON DELETE CASCADE). Pasa a ser una baja logica: se banea el login y se marca
-- eliminado_at, sin tocar la fila ni nada de su historial.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ;
