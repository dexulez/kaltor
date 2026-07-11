// Crea los 3 planes de Panadería y Repostería (Básico, Pro, Multi-tienda),
// sus módulos, una tienda de prueba por plan y los módulos de esa tienda.
// Idempotente: se puede correr varias veces.
//
// Después de correr esto: correr scripts/crear-usuarios-prueba.mjs
// para crear el usuario administrador de cada tienda nueva.
//
// Uso:
//   node --env-file=.env.local scripts/setup-planes-panaderia.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (revisa .env.local)')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

// Tasa referencial (~950 CLP/USD), igual criterio que los planes ya existentes
const DOLAR_CLP = 950

const PLANES = [
  {
    nombre: 'Panadería Básico', slug: 'panaderia-basico',
    precio_mensual: 19990, precio_anual: 199900, max_usuarios: 1, sesion_unica: true,
    modulos: ['ventas', 'compras', 'productos', 'informes', 'trazabilidad', 'configuracion', 'panaderia'],
  },
  {
    nombre: 'Panadería Pro', slug: 'panaderia-pro',
    precio_mensual: 34990, precio_anual: 349900, max_usuarios: null, sesion_unica: false,
    modulos: ['ventas', 'compras', 'productos', 'informes', 'contabilidad', 'conciliaciones', 'trazabilidad', 'configuracion', 'panaderia'],
  },
  {
    nombre: 'Panadería Multi-tienda', slug: 'panaderia-multi-tienda',
    precio_mensual: 89990, precio_anual: 899900, max_usuarios: null, sesion_unica: false,
    modulos: ['ventas', 'compras', 'productos', 'informes', 'contabilidad', 'conciliaciones', 'canal_b2b', 'trazabilidad', 'configuracion', 'panaderia'],
  },
]

async function main() {
  for (const plan of PLANES) {
    const precio_mensual_usd = Math.round((plan.precio_mensual / DOLAR_CLP) * 100) / 100

    const { data: planRow, error: planErr } = await admin
      .from('plans')
      .upsert({
        nombre: plan.nombre,
        slug: plan.slug,
        precio_mensual: plan.precio_mensual,
        precio_anual: plan.precio_anual,
        max_usuarios: plan.max_usuarios,
        sesion_unica: plan.sesion_unica,
        precio_mensual_usd,
        activo: true,
      }, { onConflict: 'slug' })
      .select('id')
      .single()
    if (planErr) throw planErr
    console.log(`Plan OK: ${plan.nombre} (${plan.slug})`)

    const moduleRows = plan.modulos.map(module_key => ({ plan_id: planRow.id, module_key }))
    const { error: pmErr } = await admin.from('plan_modules').upsert(moduleRows, { onConflict: 'plan_id,module_key' })
    if (pmErr) throw pmErr
    console.log(`  módulos: ${plan.modulos.join(', ')}`)

    const storeSlug = `prueba-${plan.slug}`
    const { data: storeRow, error: storeErr } = await admin
      .from('stores')
      .upsert({
        nombre: `PRUEBA - ${plan.nombre}`,
        slug: storeSlug,
        email: `test-${plan.slug}@kaltorpos.com`,
        plan_id: planRow.id,
        activo: true,
      }, { onConflict: 'slug' })
      .select('id')
      .single()
    if (storeErr) throw storeErr
    console.log(`  tienda de prueba OK: ${storeSlug}`)

    const storeModuleRows = plan.modulos.map(module_key => ({ store_id: storeRow.id, module_key, activo: true }))
    const { error: smErr } = await admin.from('store_modules').upsert(storeModuleRows, { onConflict: 'store_id,module_key' })
    if (smErr) throw smErr
  }

  console.log('\nListo. Ahora corre: node --env-file=.env.local scripts/crear-usuarios-prueba.mjs')
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
