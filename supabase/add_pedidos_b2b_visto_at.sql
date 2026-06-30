-- Marca de "última vez que el comprador externo abrió Pedidos B2B"
-- Se usa para que el contador de alerta del sidebar deje de mostrar
-- pedidos que el comprador ya revisó.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS pedidos_b2b_visto_at TIMESTAMPTZ;
