-- ============================================================
-- Kaltor: módulo "Panadería y Repostería"
-- Productos elaborados a partir de ingredientes + receta opcional,
-- y registro de producción por lotes (descuenta ingredientes,
-- suma stock del producto elaborado, recalcula su costo).
-- Ejecutar en Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- 1. Registrar el módulo en el catálogo (no se asigna a ningún plan
--    por defecto; se activa manualmente por tienda desde kaltor-admin)
INSERT INTO modules (key, nombre, descripcion)
VALUES ('panaderia', 'Panadería y Repostería', 'Productos elaborados a partir de ingredientes, recetas y producción por lotes')
ON CONFLICT (key) DO NOTHING;

-- 2. Marca de producto elaborado
ALTER TABLE products ADD COLUMN IF NOT EXISTS es_elaborado BOOLEAN NOT NULL DEFAULT false;

-- 3. Recetas: una por producto elaborado
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  producto_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  rendimiento_cantidad NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (rendimiento_cantidad > 0),
  rendimiento_unidad TEXT NOT NULL DEFAULT 'unidad',
  instrucciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Líneas de ingredientes de cada receta
CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  receta_id UUID NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  ingrediente_producto_id UUID NOT NULL REFERENCES products(id),
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (receta_id, ingrediente_producto_id)
);

-- 5. Producciones: cabecera de cada lote registrado
CREATE TABLE IF NOT EXISTS producciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  producto_id UUID NOT NULL REFERENCES products(id),
  receta_id UUID REFERENCES recetas(id),
  cantidad_producida NUMERIC(12,3) NOT NULL CHECK (cantidad_producida > 0),
  costo_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  usuario_id UUID REFERENCES user_profiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Detalle de consumo de ingredientes por producción (auditoría,
--    con el costo unitario del ingrediente congelado en ese momento)
CREATE TABLE IF NOT EXISTS produccion_consumos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  produccion_id UUID NOT NULL REFERENCES producciones(id) ON DELETE CASCADE,
  ingrediente_producto_id UUID NOT NULL REFERENCES products(id),
  cantidad_consumida NUMERIC(12,3) NOT NULL,
  costo_unitario_ingrediente DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. store_id automático (mismo patrón que kaltor_phase1_b_store_id.sql)
DROP TRIGGER IF EXISTS trig_store_id_recetas ON recetas;
CREATE TRIGGER trig_store_id_recetas BEFORE INSERT ON recetas
  FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

DROP TRIGGER IF EXISTS trig_store_id_receta_ingredientes ON receta_ingredientes;
CREATE TRIGGER trig_store_id_receta_ingredientes BEFORE INSERT ON receta_ingredientes
  FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

DROP TRIGGER IF EXISTS trig_store_id_producciones ON producciones;
CREATE TRIGGER trig_store_id_producciones BEFORE INSERT ON producciones
  FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

DROP TRIGGER IF EXISTS trig_store_id_produccion_consumos ON produccion_consumos;
CREATE TRIGGER trig_store_id_produccion_consumos BEFORE INSERT ON produccion_consumos
  FOR EACH ROW EXECUTE FUNCTION kaltor_auto_store_id();

-- 8. RLS multi-tenant (mismo patrón kaltor_v1 que kaltor_phase1_c_rls.sql)
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kaltor_v1 ON recetas;
CREATE POLICY kaltor_v1 ON recetas FOR ALL TO authenticated
  USING (store_id = get_current_store_id()) WITH CHECK (store_id = get_current_store_id());

ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kaltor_v1 ON receta_ingredientes;
CREATE POLICY kaltor_v1 ON receta_ingredientes FOR ALL TO authenticated
  USING (store_id = get_current_store_id()) WITH CHECK (store_id = get_current_store_id());

ALTER TABLE producciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kaltor_v1 ON producciones;
CREATE POLICY kaltor_v1 ON producciones FOR ALL TO authenticated
  USING (store_id = get_current_store_id()) WITH CHECK (store_id = get_current_store_id());

ALTER TABLE produccion_consumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kaltor_v1 ON produccion_consumos;
CREATE POLICY kaltor_v1 ON produccion_consumos FOR ALL TO authenticated
  USING (store_id = get_current_store_id()) WITH CHECK (store_id = get_current_store_id());

-- 9. Función: registrar una producción (transacción atómica)
--    Descuenta ingredientes según receta × multiplicador, valida stock
--    suficiente, suma stock al producto elaborado y recalcula su costo.
CREATE OR REPLACE FUNCTION registrar_produccion(
  p_producto_id UUID,
  p_receta_id UUID,
  p_multiplicador NUMERIC,
  p_notas TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_store_id UUID := get_current_store_id();
  v_receta RECORD;
  v_ing RECORD;
  v_consumo NUMERIC;
  v_costo_total DECIMAL(12,2) := 0;
  v_costo_unitario DECIMAL(12,2);
  v_cantidad_producida NUMERIC(12,3);
  v_produccion_id UUID;
  v_stock_actual NUMERIC;
BEGIN
  SELECT * INTO v_receta FROM recetas
    WHERE id = p_receta_id AND producto_id = p_producto_id AND store_id = v_store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receta no encontrada para este producto';
  END IF;

  v_cantidad_producida := v_receta.rendimiento_cantidad * p_multiplicador;

  -- Validar stock suficiente de todos los ingredientes ANTES de descontar nada
  FOR v_ing IN
    SELECT ri.ingrediente_producto_id, ri.cantidad, p.nombre, p.stock_actual
    FROM receta_ingredientes ri
    JOIN products p ON p.id = ri.ingrediente_producto_id
    WHERE ri.receta_id = p_receta_id
  LOOP
    v_consumo := v_ing.cantidad * p_multiplicador;
    IF v_ing.stock_actual < v_consumo THEN
      RAISE EXCEPTION 'Stock insuficiente de "%": disponible %, se necesita %',
        v_ing.nombre, v_ing.stock_actual, v_consumo;
    END IF;
  END LOOP;

  -- Descontar ingredientes y registrar consumo + movimiento de stock
  FOR v_ing IN
    SELECT ri.ingrediente_producto_id, ri.cantidad, p.precio_costo, p.stock_actual
    FROM receta_ingredientes ri
    JOIN products p ON p.id = ri.ingrediente_producto_id
    WHERE ri.receta_id = p_receta_id
  LOOP
    v_consumo := v_ing.cantidad * p_multiplicador;
    v_costo_total := v_costo_total + (v_consumo * v_ing.precio_costo);

    UPDATE products SET stock_actual = stock_actual - v_consumo, updated_at = now()
      WHERE id = v_ing.ingrediente_producto_id;
  END LOOP;

  v_costo_unitario := v_costo_total / v_cantidad_producida;

  INSERT INTO producciones (store_id, producto_id, receta_id, cantidad_producida, costo_total, costo_unitario, usuario_id, notas)
  VALUES (v_store_id, p_producto_id, p_receta_id, v_cantidad_producida, v_costo_total, v_costo_unitario, auth.uid(), p_notas)
  RETURNING id INTO v_produccion_id;

  -- Detalle de consumo + movimientos de salida (después de tener el id de producción)
  FOR v_ing IN
    SELECT ri.ingrediente_producto_id, ri.cantidad, p.precio_costo, p.stock_actual AS stock_nuevo, p.nombre
    FROM receta_ingredientes ri
    JOIN products p ON p.id = ri.ingrediente_producto_id
    WHERE ri.receta_id = p_receta_id
  LOOP
    v_consumo := v_ing.cantidad * p_multiplicador;

    INSERT INTO produccion_consumos (store_id, produccion_id, ingrediente_producto_id, cantidad_consumida, costo_unitario_ingrediente)
    VALUES (v_store_id, v_produccion_id, v_ing.ingrediente_producto_id, v_consumo, v_ing.precio_costo);

    INSERT INTO stock_movements (product_id, tipo, cantidad, stock_anterior, stock_nuevo, razon, referencia_id, referencia_tipo, usuario_id)
    VALUES (v_ing.ingrediente_producto_id, 'salida', v_consumo, v_ing.stock_nuevo + v_consumo, v_ing.stock_nuevo,
            'Producción de ' || (SELECT nombre FROM products WHERE id = p_producto_id), v_produccion_id, 'produccion', auth.uid());
  END LOOP;

  -- Sumar stock y actualizar costo del producto elaborado
  SELECT stock_actual INTO v_stock_actual FROM products WHERE id = p_producto_id;

  UPDATE products
    SET stock_actual = stock_actual + v_cantidad_producida,
        precio_costo = v_costo_unitario,
        updated_at = now()
    WHERE id = p_producto_id;

  INSERT INTO stock_movements (product_id, tipo, cantidad, stock_anterior, stock_nuevo, razon, referencia_id, referencia_tipo, usuario_id)
  VALUES (p_producto_id, 'entrada', v_cantidad_producida, v_stock_actual, v_stock_actual + v_cantidad_producida,
          'Producción registrada', v_produccion_id, 'produccion', auth.uid());

  RETURN v_produccion_id;
END;
$$;

COMMIT;

-- Verificación
SELECT key, nombre FROM modules WHERE key = 'panaderia';
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('recetas', 'receta_ingredientes', 'producciones', 'produccion_consumos');
