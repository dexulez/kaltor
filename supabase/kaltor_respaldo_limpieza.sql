-- ============================================================
-- Respaldo y limpieza del sistema (Configuración → Respaldo y limpieza)
-- Ejecutar en Supabase SQL Editor
--
-- Crea dos funciones usadas por /api/configuracion/respaldo/*:
--   - fn_contar_categoria: cuenta filas por categoría (para mostrar antes de borrar)
--   - fn_borrar_categoria: borra todas las filas de una tienda para una categoría,
--     en orden hijo→padre, dentro de una sola transacción (todo o nada).
--
-- Categorías cubiertas: ventas, inventario, compras, proveedores,
-- clientes_reparaciones, gastos_finanzas, pedidos_b2b, notificaciones.
--
-- Nota: cada categoría solo borra sus propias tablas. Si otra categoría
-- todavía referencia filas de esta (ej. borrar "proveedores" mientras
-- "compras" o "inventario" aún tienen datos), Postgres rechaza el DELETE
-- por llave foránea y la función completa revierte — no se borra nada a medias.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_contar_categoria(p_categoria text, p_store_id uuid)
RETURNS TABLE(tabla text, cantidad bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_categoria = 'ventas' THEN
    RETURN QUERY SELECT 'ventas'::text, count(*) FROM sales WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'items_de_venta'::text, count(*) FROM sale_items WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'correcciones_de_caja'::text, count(*) FROM correcciones_caja WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'arqueos_de_caja'::text, count(*) FROM arqueos_caja WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'sesiones_de_caja'::text, count(*) FROM sesiones_caja WHERE store_id = p_store_id;

  ELSIF p_categoria = 'inventario' THEN
    RETURN QUERY SELECT 'productos'::text, count(*) FROM products WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'categorias_de_producto'::text, count(*) FROM product_categories WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'movimientos_de_stock'::text, count(*) FROM stock_movements WHERE store_id = p_store_id;

  ELSIF p_categoria = 'compras' THEN
    RETURN QUERY SELECT 'ordenes_de_compra'::text, count(*) FROM purchase_orders WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'items_de_orden_de_compra'::text, count(*) FROM purchase_order_items WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'pagos_de_orden_de_compra'::text, count(*) FROM purchase_order_payments WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'liquidaciones_de_proveedor'::text, count(*) FROM supplier_settlements WHERE store_id = p_store_id;

  ELSIF p_categoria = 'proveedores' THEN
    RETURN QUERY SELECT 'proveedores'::text, count(*) FROM suppliers WHERE store_id = p_store_id;

  ELSIF p_categoria = 'clientes_reparaciones' THEN
    RETURN QUERY SELECT 'clientes'::text, count(*) FROM customers WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'equipos'::text, count(*) FROM equipment WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'ordenes_de_trabajo'::text, count(*) FROM repair_orders WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'items_de_ot'::text, count(*) FROM repair_items WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'historial_de_estados_ot'::text, count(*) FROM repair_status_history WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'servicios_aplicados_en_ot'::text, count(*) FROM repair_order_services WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'abonos_de_ot'::text, count(*) FROM repair_deposits WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'comisiones_de_tecnico'::text, count(*) FROM technician_commissions
      WHERE repair_order_id IN (SELECT id FROM repair_orders WHERE store_id = p_store_id);
    RETURN QUERY SELECT 'abonos_de_credito_de_cliente'::text, count(*) FROM customer_credit_payments WHERE store_id = p_store_id;

  ELSIF p_categoria = 'gastos_finanzas' THEN
    RETURN QUERY SELECT 'gastos'::text, count(*) FROM gastos WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'gastos_extras'::text, count(*) FROM gastos_extras WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'gastos_fijos'::text, count(*) FROM gastos_fijos WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'empleados_del_taller'::text, count(*) FROM empleados_taller WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'pagos_previsionales'::text, count(*) FROM pagos_previsionales WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'cuentas_bancarias'::text, count(*) FROM cuentas_bancarias WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'movimientos_bancarios'::text, count(*) FROM movimientos_bancarios WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'obligaciones_tributarias'::text, count(*) FROM obligaciones_tributarias WHERE store_id = p_store_id;

  ELSIF p_categoria = 'pedidos_b2b' THEN
    RETURN QUERY SELECT 'pedidos_mayoristas'::text, count(*) FROM sales_orders WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'items_de_pedido_mayorista'::text, count(*) FROM sales_order_items WHERE store_id = p_store_id;
    RETURN QUERY SELECT 'pagos_de_pedido_mayorista'::text, count(*) FROM sales_order_payments WHERE store_id = p_store_id;

  ELSIF p_categoria = 'notificaciones' THEN
    RETURN QUERY SELECT 'notificaciones'::text, count(*) FROM notifications WHERE store_id = p_store_id;

  ELSE
    RAISE EXCEPTION 'Categoría desconocida: %', p_categoria;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_borrar_categoria(p_categoria text, p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_categoria = 'ventas' THEN
    DELETE FROM sale_items WHERE store_id = p_store_id;
    DELETE FROM sales WHERE store_id = p_store_id;
    DELETE FROM correcciones_caja WHERE store_id = p_store_id;
    DELETE FROM arqueos_caja WHERE store_id = p_store_id;
    DELETE FROM sesiones_caja WHERE store_id = p_store_id;

  ELSIF p_categoria = 'inventario' THEN
    DELETE FROM stock_movements WHERE store_id = p_store_id;
    DELETE FROM products WHERE store_id = p_store_id;
    DELETE FROM product_categories WHERE store_id = p_store_id;

  ELSIF p_categoria = 'compras' THEN
    DELETE FROM purchase_order_payments WHERE store_id = p_store_id;
    DELETE FROM purchase_order_items WHERE store_id = p_store_id;
    DELETE FROM purchase_orders WHERE store_id = p_store_id;
    DELETE FROM supplier_settlements WHERE store_id = p_store_id;

  ELSIF p_categoria = 'proveedores' THEN
    DELETE FROM suppliers WHERE store_id = p_store_id;

  ELSIF p_categoria = 'clientes_reparaciones' THEN
    DELETE FROM repair_status_history WHERE store_id = p_store_id;
    DELETE FROM repair_items WHERE store_id = p_store_id;
    DELETE FROM repair_order_services WHERE store_id = p_store_id;
    DELETE FROM repair_deposits WHERE store_id = p_store_id;
    DELETE FROM technician_commissions
      WHERE repair_order_id IN (SELECT id FROM repair_orders WHERE store_id = p_store_id);
    DELETE FROM repair_orders WHERE store_id = p_store_id;
    DELETE FROM equipment WHERE store_id = p_store_id;
    DELETE FROM customer_credit_payments WHERE store_id = p_store_id;
    DELETE FROM customers WHERE store_id = p_store_id;

  ELSIF p_categoria = 'gastos_finanzas' THEN
    DELETE FROM pagos_previsionales WHERE store_id = p_store_id;
    DELETE FROM movimientos_bancarios WHERE store_id = p_store_id;
    DELETE FROM gastos WHERE store_id = p_store_id;
    DELETE FROM gastos_extras WHERE store_id = p_store_id;
    DELETE FROM gastos_fijos WHERE store_id = p_store_id;
    DELETE FROM obligaciones_tributarias WHERE store_id = p_store_id;
    DELETE FROM cuentas_bancarias WHERE store_id = p_store_id;
    DELETE FROM empleados_taller WHERE store_id = p_store_id;

  ELSIF p_categoria = 'pedidos_b2b' THEN
    DELETE FROM sales_order_payments WHERE store_id = p_store_id;
    DELETE FROM sales_order_items WHERE store_id = p_store_id;
    DELETE FROM sales_orders WHERE store_id = p_store_id;

  ELSIF p_categoria = 'notificaciones' THEN
    DELETE FROM notifications WHERE store_id = p_store_id;

  ELSE
    RAISE EXCEPTION 'Categoría desconocida: %', p_categoria;
  END IF;
END;
$$;

-- Verificar
SELECT proname FROM pg_proc WHERE proname IN ('fn_contar_categoria', 'fn_borrar_categoria');
