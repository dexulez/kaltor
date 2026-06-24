-- Permite "guardar" (fijar) una notificación para que no se pierda entre las demás.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS guardado BOOLEAN NOT NULL DEFAULT false;
