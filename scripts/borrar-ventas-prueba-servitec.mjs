// Borra TODAS las ventas de prueba de la tienda "servitec" para empezar a llevar
// el registro real de caja/ventas diarias. NO toca repair_orders (OTs) ni customers.
//
// Alcance confirmado con el usuario (2026-07-11):
//   1. Restaura el stock descontado por esas ventas (products.stock_actual + ajuste en stock_movements).
//   2. Borra los pedidos B2B (sales_orders) que quedaron enlazados a esas ventas de prueba (cascada a items/pagos).
//   3. Borra las ventas (sales) de la tienda servitec (cascada a sale_items).
//   4. Borra las sesiones de caja (sesiones_caja) de servitec (cascada a arqueos_caja).
//
// Las OTs y sus estados, y los clientes, no se tocan en absoluto: no se ejecuta
// ningún UPDATE/DELETE sobre repair_orders ni customers.
//
// Uso:
//   node --env-file=.env.local scripts/borrar-ventas-prueba-servitec.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data: servitec, error: storeErr } = await admin.from('stores').select('id, nombre').eq('slug', 'servitec').single()
  if (storeErr || !servitec) throw storeErr ?? new Error('No se encontró la tienda "servitec"')
  const storeId = servitec.id
  console.log(`Tienda objetivo: ${servitec.nombre} (${storeId})\n`)

  const { data: ventas, error: ventasErr } = await admin.from('sales').select('id').eq('store_id', storeId)
  if (ventasErr) throw ventasErr
  const saleIds = (ventas ?? []).map(v => v.id)
  console.log(`Ventas a eliminar: ${saleIds.length}`)
  if (saleIds.length === 0) { console.log('No hay ventas para eliminar. Fin.'); return }

  // 1. Restaurar stock de los sale_items con producto
  const { data: items, error: itemsErr } = await admin
    .from('sale_items')
    .select('product_id, cantidad, sale_id')
    .in('sale_id', saleIds)
    .not('product_id', 'is', null)
  if (itemsErr) throw itemsErr

  const porProducto = {}
  for (const it of items ?? []) {
    porProducto[it.product_id] = (porProducto[it.product_id] ?? 0) + Number(it.cantidad)
  }
  const productIds = Object.keys(porProducto)
  console.log(`\nRestaurando stock de ${productIds.length} productos...`)

  for (const productId of productIds) {
    const cantidad = porProducto[productId]
    const { data: producto, error: prodErr } = await admin.from('products').select('stock_actual, nombre').eq('id', productId).single()
    if (prodErr || !producto) { console.warn(`  ! Producto ${productId} no encontrado, se omite (¿fue borrado?): ${prodErr?.message ?? ''}`); continue }

    const stockAnterior = Number(producto.stock_actual)
    const stockNuevo = stockAnterior + cantidad

    const { error: updErr } = await admin.from('products').update({ stock_actual: stockNuevo }).eq('id', productId)
    if (updErr) throw updErr

    const { error: movErr } = await admin.from('stock_movements').insert({
      store_id: storeId,
      product_id: productId,
      tipo: 'ajuste',
      cantidad,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      razon: 'Reversión de venta de prueba eliminada (limpieza previa al inicio de registro real)',
    })
    if (movErr) throw movErr

    console.log(`  ${producto.nombre}: ${stockAnterior} -> ${stockNuevo} (+${cantidad})`)
  }

  // 2. Borrar pedidos B2B (sales_orders) enlazados a estas ventas (cascada a items/pagos)
  const { data: pedidosB2B, error: pedidosErr } = await admin.from('sales_orders').select('id').in('sale_id', saleIds)
  if (pedidosErr) throw pedidosErr
  if (pedidosB2B && pedidosB2B.length > 0) {
    console.log(`\nBorrando ${pedidosB2B.length} pedidos B2B enlazados a ventas de prueba...`)
    const { error: delPedidosErr } = await admin.from('sales_orders').delete().in('id', pedidosB2B.map(p => p.id))
    if (delPedidosErr) throw delPedidosErr
  }

  // 3. Borrar las ventas (cascada a sale_items)
  console.log(`\nBorrando ${saleIds.length} ventas...`)
  const { error: delVentasErr } = await admin.from('sales').delete().eq('store_id', storeId)
  if (delVentasErr) throw delVentasErr

  // 4. Borrar sesiones de caja de servitec (cascada a arqueos_caja)
  const { data: sesiones, error: sesionesErr } = await admin.from('sesiones_caja').select('id').eq('store_id', storeId)
  if (sesionesErr) throw sesionesErr
  if (sesiones && sesiones.length > 0) {
    console.log(`\nBorrando ${sesiones.length} sesiones de caja...`)
    const { error: delSesionesErr } = await admin.from('sesiones_caja').delete().eq('store_id', storeId)
    if (delSesionesErr) throw delSesionesErr
  }

  // Verificación final
  const { count: ventasRestantes } = await admin.from('sales').select('*', { count: 'exact', head: true }).eq('store_id', storeId)
  const { count: sesionesRestantes } = await admin.from('sesiones_caja').select('*', { count: 'exact', head: true }).eq('store_id', storeId)
  console.log(`\nListo. Ventas restantes en servitec: ${ventasRestantes}. Sesiones de caja restantes: ${sesionesRestantes}.`)
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
