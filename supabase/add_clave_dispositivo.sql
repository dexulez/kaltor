-- Agrega columna para guardar PIN/Patrón/Contraseña del dispositivo en reparación
ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS clave_dispositivo JSONB;

-- Ejemplo de formato almacenado:
-- { "tipo": "patron", "valor": "0-1-2-5-8", "notas": null }
-- { "tipo": "pin",    "valor": "1234",       "notas": "PIN de respaldo: 9876" }
-- { "tipo": "texto",  "valor": "Abc123!",    "notas": null }
