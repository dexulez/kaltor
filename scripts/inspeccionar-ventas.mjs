// Solo LECTURA. Dimensiona el impacto de borrar las ventas de la tienda "servitec"
// antes de decidir el alcance exacto del borrado real.
//
// Uso:
//   node --env-file=.env.local scripts/inspeccionar-ventas.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data: stores, error: storesErr } = await admin.from('stores').select('id, nombre, slug')
  if (storesErr) throw storesErr
  console.log('=== Tiendas ===')
  console.table(stores)

  const servitec = stores.find(s => s.slug === 'servitec')
  if (!servitec) { console.error('No se encontró la tienda "servitec"'); process.exit(1) }
  console.log(`\nTienda objetivo: ${servitec.nombre} (${servitec.id})\n`)

  for (const s of stores) {
    const { count } = await admin.from('sales').select('*', { count: 'exact', head: true }).eq('store_id', s.id)
    console.log(`Ventas en "${s.slug}": ${count}`)
  }

  const { data: rango } = await admin.from('sales').select('created_at').eq('store_id', servitec.id).order('created_at', { ascending: true }).limit(1)
  const { data: rangoFin } = await admin.from('sales').select('created_at').eq('store_id', servitec.id).order('created_at', { ascending: false }).limit(1)
  console.log('\nRango de fechas de ventas Servitec:', rango?.[0]?.created_at, '->', rangoFin?.[0]?.created_at)

  const { count: sesionesCount } = await admin.from('sesiones_caja').select('*', { count: 'exact', head: true }).eq('store_id', servitec.id)
  console.log('\nSesiones de caja (Servitec):', sesionesCount)
  const { data: sesionesCerradas } = await admin.from('sesiones_caja').select('id, fecha, estado, efectivo_cierre, transbank_cierre, transferencia_cierre').eq('store_id', servitec.id).eq('estado', 'cerrada')
  console.log('Sesiones de caja cerradas (con totales ya congelados):', sesionesCerradas?.length ?? 0)

  const { count: arqueosCount } = await admin.from('arqueos_caja').select('*', { count: 'exact', head: true })
  console.log('Arqueos de caja (total, sin filtro store):', arqueosCount)

  // Sale ids de servitec
  const { data: ventasIds } = await admin.from('sales').select('id').eq('store_id', servitec.id)
  const ids = (ventasIds ?? []).map(v => v.id)
  console.log(`\nTotal de IDs de venta a considerar: ${ids.length}`)

  if (ids.length > 0) {
    // Chequear referencias externas (movimientos_bancarios, sales_orders) - en lotes por si son muchas
    const { count: movBancariosCount, error: movErr } = await admin
      .from('movimientos_bancarios').select('*', { count: 'exact', head: true }).in('sale_id', ids.slice(0, 1000))
    console.log('movimientos_bancarios referenciando esas ventas (primeros 1000 ids):', movErr ? `error: ${movErr.message}` : movBancariosCount)

    const { count: salesOrdersCount, error: soErr } = await admin
      .from('sales_orders').select('*', { count: 'exact', head: true }).in('sale_id', ids.slice(0, 1000))
    console.log('sales_orders referenciando esas ventas (primeros 1000 ids):', soErr ? `error: ${soErr.message}` : salesOrdersCount)
  }

  // Impacto en stock: sale_items con product_id no nulo, de ventas de servitec
  const { data: items, error: itemsErr } = await admin
    .from('sale_items')
    .select('product_id, cantidad, sales!inner(store_id)')
    .eq('sales.store_id', servitec.id)
    .not('product_id', 'is', null)
  if (itemsErr) {
    console.log('\nError consultando sale_items con join:', itemsErr.message)
  } else {
    const porProducto = {}
    for (const it of items ?? []) {
      porProducto[it.product_id] = (porProducto[it.product_id] ?? 0) + Number(it.cantidad)
    }
    const productosAfectados = Object.keys(porProducto).length
    const unidadesTotales = Object.values(porProducto).reduce((a, b) => a + b, 0)
    console.log(`\nProductos afectados por stock a revertir: ${productosAfectados}`)
    console.log(`Unidades totales que se sumarían de vuelta al stock: ${unidadesTotales}`)
  }

  // Ventas ligadas a OTs (repair_order_id no nulo) para saber cuántas OTs quedarán "sin venta" tras el borrado
  const { count: ventasConOT } = await admin.from('sales').select('*', { count: 'exact', head: true }).eq('store_id', servitec.id).not('repair_order_id', 'is', null)
  console.log(`\nVentas de Servitec ligadas a una OT (repair_order_id no nulo): ${ventasConOT}`)
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
