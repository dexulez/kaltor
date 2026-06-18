import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCLP } from '@/lib/calculations'
import GastoRapidoModal from '@/components/dashboard/GastoRapidoModal'
import QRScannerOT from '@/components/dashboard/QRScannerOT'
import { labelTipoEquipo } from '@/lib/tipoEquipo'

const TZ = 'America/Santiago'

const ESTADO_BADGE: Record<string, string> = {
  recibido: 'bg-gray-100 text-gray-700',
  en_diagnostico: 'bg-yellow-100 text-yellow-700',
  presupuestado: 'bg-blue-100 text-blue-700',
  aprobado: 'bg-indigo-100 text-indigo-700',
  esperando_repuesto: 'bg-orange-100 text-orange-700',
  en_reparacion: 'bg-purple-100 text-purple-700',
  listo: 'bg-green-100 text-green-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-200 text-gray-500',
  en_garantia: 'bg-teal-100 text-teal-700',
}

const ESTADO_LABEL: Record<string, string> = {
  recibido: 'Recibido', en_diagnostico: 'Diagnóstico', presupuestado: 'Presupuestado',
  aprobado: 'Aprobado', esperando_repuesto: 'Esp. repuesto', en_reparacion: 'En reparación',
  listo: 'Listo ✓', entregado: 'Entregado', rechazado: 'Rechazado', cancelado: 'Cancelado',
  en_garantia: 'En garantía',
}

const CAT_ICON: Record<string, string> = {
  arriendo: '🏠', servicios: '💡', sueldos: '👤', materiales: '🧹',
  herramientas: '🔧', publicidad: '📢', alimentacion: '🍽️',
  transporte: '🚗', impuestos: '📋', varios: '📦',
}

function KpiCard({ label, value, sub, colorClass, href }: {
  label: string; value: string; sub?: string; colorClass?: string; href?: string
}) {
  const content = (
    <div className="bg-white rounded-xl border p-4 hover:border-blue-300 transition-colors">
      <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Compradores externos no tienen un dashboard administrativo — van directo al catálogo.
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileRol } = await supabase.from('user_profiles').select('roles(nombre)').eq('id', user!.id).single()
  const rolesRel = profileRol?.roles as { nombre?: string } | { nombre?: string }[] | null | undefined
  const rolActual = (Array.isArray(rolesRel) ? rolesRel[0]?.nombre : rolesRel?.nombre) ?? ''
  if (rolActual === 'comprador_externo') redirect('/catalogo-b2b')

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const hoyStart = `${hoy}T00:00:00`
  const ahora    = new Date().toISOString()

  // Sesión de caja activa — usamos su apertura_at como punto de inicio
  const { data: sesionData } = await supabase
    .from('sesiones_caja')
    .select('id, apertura_at, fecha, estado, efectivo_apertura')
    .eq('estado', 'abierta')
    .order('created_at', { ascending: false })
    .limit(1)

  type SesionRow = { id: string; apertura_at: string; fecha: string; estado: string; efectivo_apertura: number }
  const sesionActiva = (sesionData?.[0] ?? null) as SesionRow | null

  // Si hay sesión abierta: datos desde la apertura. Si no: desde medianoche de hoy.
  const desde = sesionActiva?.apertura_at ?? hoyStart
  const hasta  = ahora

  // Etiqueta de contexto temporal para los KPIs
  const labelTemporal = sesionActiva ? 'sesión' : 'hoy'
  const sesionDesdeLabel = sesionActiva
    ? new Date(sesionActiva.apertura_at).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    : null

  const [
    { count: otActivas },
    { count: otHoy },
    { count: otListasCobrar },
    { data: ventasHoyRaw },
    { data: stockCritico },
    { data: otsRaw },
    { data: ventasListRaw },
    gastosRes,
    comprasRes,
    { data: tecOTsRaw },
  ] = await Promise.all([
    supabase.from('repair_orders').select('*', { count: 'exact', head: true })
      .not('estado', 'in', '("entregado","cancelado","rechazado")'),
    supabase.from('repair_orders').select('*', { count: 'exact', head: true })
      .gte('created_at', hoyStart),
    supabase.from('repair_orders').select('*', { count: 'exact', head: true })
      .eq('estado', 'listo'),
    supabase.from('sales').select('total, iva, ppm')
      .gte('created_at', desde).lte('created_at', hasta).eq('anulada', false),
    supabase.from('products').select('nombre, stock_actual, stock_minimo')
      .filter('stock_actual', 'lte', 'stock_minimo').eq('activo', true).limit(5),
    supabase.from('repair_orders')
      .select('id, numero_ot, estado, created_at, customers(nombre), equipment(tipo_equipo, marca, modelo)')
      .not('estado', 'in', '("entregado","cancelado","rechazado")')
      .order('created_at', { ascending: false }).limit(10),
    supabase.from('sales')
      .select('id, numero_venta, total, metodo_pago, tipo_documento, created_at, customers(nombre)')
      .gte('created_at', desde).lte('created_at', hasta)
      .order('created_at', { ascending: false }).eq('anulada', false),
    supabase.from('gastos')
      .select('id, concepto, monto, categoria, metodo_pago, created_at')
      .gte('created_at', desde).lte('created_at', hasta)
      .order('created_at', { ascending: false })
      .then(r => r.error?.message.toLowerCase().includes('gastos') ? { data: [] as GastoItem[], error: null } : r),
    supabase.from('purchase_orders')
      .select('id, numero_oc, total, estado, created_at, suppliers(nombre)')
      .gte('created_at', desde).lte('created_at', hasta)
      .order('created_at', { ascending: false })
      .then(r => r.error ? { data: [] as CompraItem[], error: null } : r),
    supabase.from('repair_orders')
      .select('tecnico_id, estado, presupuesto_estimado, precio_servicio, user_profiles!repair_orders_tecnico_id_fkey(nombre_completo)')
      .not('tecnico_id', 'is', null)
      .not('estado', 'in', '("cancelado","rechazado")')
      .then(r => r.error ? { data: [] } : r),
  ])

  type GastoItem  = { id: string; concepto: string; monto: number; categoria: string; metodo_pago: string; created_at: string }
  type CompraItem = { id: string; numero_oc: string; total: number; estado: string; created_at: string; suppliers: { nombre: string } | null }
  type OTItem     = { id: string; numero_ot: string; estado: string; created_at: string; customers: { nombre: string } | null; equipment: { tipo_equipo?: string | null; marca: string; modelo: string } | null }
  type VentaItem  = { id: string; numero_venta: string; total: number; metodo_pago: string; tipo_documento: string; created_at: string; customers: { nombre: string } | null }

  const gastosList  = (gastosRes.data  ?? []) as GastoItem[]
  const comprasList = (comprasRes.data ?? []) as CompraItem[]

  const normalizeJoin = <T,>(raw: Record<string, unknown>, key: string): T | null => {
    const v = raw[key]
    return (Array.isArray(v) ? v[0] ?? null : v ?? null) as T | null
  }

  const otsList: OTItem[] = (otsRaw ?? []).map(ot => ({
    ...(ot as Record<string, unknown>),
    customers: normalizeJoin<{ nombre: string }>(ot as Record<string, unknown>, 'customers'),
    equipment: normalizeJoin<{ marca: string; modelo: string }>(ot as Record<string, unknown>, 'equipment'),
  })) as OTItem[]

  const ventasList: VentaItem[] = (ventasListRaw ?? []).map(v => ({
    ...(v as Record<string, unknown>),
    customers: normalizeJoin<{ nombre: string }>(v as Record<string, unknown>, 'customers'),
  })) as VentaItem[]

  // KPIs
  const totalVentasHoy = ventasHoyRaw?.reduce((s, v) => s + v.total, 0) ?? 0
  const totalGastosHoy = gastosList.reduce((s, g) => s + g.monto, 0)
  const totalComprasHoy = comprasList.reduce((s, c) => s + (c.total ?? 0), 0)
  const balanceDia = totalVentasHoy - totalGastosHoy

  // Técnicos
  type TecRaw = { tecnico_id: string; estado: string; presupuesto_estimado: number | null; precio_servicio: number | null; user_profiles: unknown }
  const tecMap: Record<string, { nombre: string; activas: number; listas: number; facturado: number }> = {}
  ;(tecOTsRaw as TecRaw[] ?? []).forEach(ot => {
    if (!ot.tecnico_id) return
    const profiles = ot.user_profiles
    const nombre = Array.isArray(profiles)
      ? (profiles[0] as { nombre_completo: string } | undefined)?.nombre_completo ?? 'Sin nombre'
      : (profiles as { nombre_completo: string } | null)?.nombre_completo ?? 'Sin nombre'
    if (!tecMap[ot.tecnico_id]) tecMap[ot.tecnico_id] = { nombre, activas: 0, listas: 0, facturado: 0 }
    tecMap[ot.tecnico_id].activas++
    if (ot.estado === 'listo') tecMap[ot.tecnico_id].listas++
    tecMap[ot.tecnico_id].facturado += ot.precio_servicio ?? ot.presupuesto_estimado ?? 0
  })
  const tecnicos = Object.values(tecMap).sort((a, b) => b.activas - a.activas)

  const fechaLabel = new Date().toLocaleDateString('es-CL', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm capitalize">{fechaLabel}</p>
          {sesionDesdeLabel && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full">
              🟢 Sesión abierta desde las {sesionDesdeLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reparaciones/nueva">
            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-xl font-medium transition-colors">
              📋 Nueva OT
            </button>
          </Link>
          <Link href="/caja/venta-directa">
            <button className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-xl font-medium transition-colors">
              🛒 Venta directa
            </button>
          </Link>
          <QRScannerOT />
          <GastoRapidoModal />
          <Link href="/compras/orden/nueva">
            <button className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 text-sm px-3 py-2 rounded-xl font-medium transition-colors">
              📦 Nueva OC
            </button>
          </Link>
        </div>
      </div>

      {/* ── KPIs del día ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label={`Ventas ${labelTemporal}`} href="/caja"
          value={formatCLP(totalVentasHoy)}
          sub={`${ventasList.length} venta(s)`}
          colorClass="text-green-700"
        />
        <KpiCard
          label={`Gastos ${labelTemporal}`}
          value={formatCLP(totalGastosHoy)}
          sub={`${gastosList.length} gasto(s)`}
          colorClass="text-red-600"
        />
        <KpiCard
          label={`Balance ${labelTemporal}`}
          value={`${balanceDia < 0 ? '-' : ''}${formatCLP(Math.abs(balanceDia))}`}
          sub="Ventas − Gastos"
          colorClass={balanceDia >= 0 ? 'text-blue-700' : 'text-red-600'}
        />
        <KpiCard
          label="OT activas" href="/reparaciones"
          value={String(otActivas ?? 0)}
          colorClass="text-blue-600"
        />
        <KpiCard
          label="Listas cobrar" href="/caja"
          value={String(otListasCobrar ?? 0)}
          colorClass={(otListasCobrar ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'}
        />
        <KpiCard
          label="OT hoy"
          value={String(otHoy ?? 0)}
          sub={totalComprasHoy > 0 ? `Compras: ${formatCLP(totalComprasHoy)}` : 'Sin compras'}
          colorClass="text-orange-600"
        />
      </div>

      {/* ── Stock crítico ────────────────────────────────────────────────────── */}
      {stockCritico && stockCritico.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Productos con stock crítico</p>
          <div className="flex flex-wrap gap-2">
            {stockCritico.map((p, i) => (
              <Link key={i} href="/inventario">
                <div className="bg-white border border-red-200 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 hover:border-red-400 transition-colors">
                  <span className="font-medium text-gray-800">{p.nombre}</span>
                  <span className="text-red-600 font-bold text-xs">{p.stock_actual}/{p.stock_minimo}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Columnas principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* OTs activas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">📋 OTs en proceso <span className="text-gray-400 font-normal">({otActivas ?? 0})</span></h2>
            <Link href="/reparaciones" className="text-xs text-blue-600 hover:underline">Ver todas →</Link>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!otsList.length ? (
              <div className="text-center py-10 text-sm text-gray-400">Sin OTs activas</div>
            ) : (
              <div className="divide-y">
                {otsList.map((ot) => (
                  <Link key={ot.id} href={`/reparaciones/${ot.id}`}>
                    <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono font-bold text-blue-700 text-xs">{ot.numero_ot}</p>
                        <p className="text-sm text-gray-800 truncate">{ot.customers?.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{[labelTipoEquipo(ot.equipment?.tipo_equipo), ot.equipment?.marca, ot.equipment?.modelo].filter(Boolean).join(' ')}</p>
                      </div>
                      <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[ot.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABEL[ot.estado] ?? ot.estado}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/reparaciones/nueva">
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-3 text-center text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium cursor-pointer">
              + Nueva OT
            </div>
          </Link>
        </div>

        {/* Ventas del día */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">💰 Ventas de la {labelTemporal}</h2>
            <Link href="/caja" className="text-xs text-blue-600 hover:underline">Ver caja →</Link>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!ventasList.length ? (
              <div className="text-center py-10 text-sm text-gray-400">Sin ventas en esta {labelTemporal}</div>
            ) : (
              <div className="divide-y">
                {ventasList.map((v) => (
                  <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400 font-mono">{v.numero_venta}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{v.customers?.nombre ?? 'Sin cliente'}</p>
                      <p className="text-xs text-gray-500 capitalize">{v.metodo_pago} · {v.tipo_documento}</p>
                    </div>
                    <p className="font-bold text-gray-900 shrink-0 ml-2">{formatCLP(v.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {totalVentasHoy > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
              <span className="text-xs font-medium text-green-700">Total ventas {labelTemporal}</span>
              <span className="font-bold text-green-700">{formatCLP(totalVentasHoy)}</span>
            </div>
          )}
          <Link href="/caja/venta-directa">
            <div className="border-2 border-dashed border-green-200 rounded-xl p-3 text-center text-green-600 hover:border-green-400 hover:bg-green-50 transition-colors text-sm font-medium cursor-pointer">
              + Venta directa
            </div>
          </Link>
        </div>

        {/* Gastos del día */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">💸 Gastos de la {labelTemporal}</h2>
            <GastoRapidoModal variant="link" />
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!gastosList.length ? (
              <div className="text-center py-10 text-sm text-gray-400">
                <p>Sin gastos en esta {labelTemporal}</p>
              </div>
            ) : (
              <div className="divide-y">
                {gastosList.map((g) => (
                  <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {CAT_ICON[g.categoria] ?? '📦'} {g.concepto}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(g.created_at).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
                        {' · '}{g.metodo_pago}
                      </p>
                    </div>
                    <p className="font-bold text-red-600 shrink-0 ml-2">{formatCLP(g.monto)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {totalGastosHoy > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
              <span className="text-xs font-medium text-red-700">Total gastos {labelTemporal}</span>
              <span className="font-bold text-red-700">{formatCLP(totalGastosHoy)}</span>
            </div>
          )}
          <GastoRapidoModal />
        </div>
      </div>

      {/* ── Compras de hoy ───────────────────────────────────────────────────── */}
      {comprasList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">📦 Compras de la {labelTemporal} · {formatCLP(totalComprasHoy)}</h2>
            <Link href="/compras" className="text-xs text-blue-600 hover:underline">Ver compras →</Link>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="divide-y">
              {comprasList.map((c) => (
                <div key={c.id} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-mono text-gray-400">{c.numero_oc}</p>
                    <p className="text-sm font-medium text-gray-800">{c.suppliers?.nombre ?? 'Sin proveedor'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCLP(c.total ?? 0)}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.estado?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Técnicos ─────────────────────────────────────────────────────────── */}
      {tecnicos.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 text-sm mb-3">👨‍🔧 OTs por técnico</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {tecnicos.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border p-4">
                <p className="font-semibold text-gray-800 text-sm truncate mb-2">{t.nombre}</p>
                <div className="grid grid-cols-2 gap-1.5 text-center text-xs">
                  <div className="bg-blue-50 rounded-lg py-2">
                    <p className="text-xl font-bold text-blue-700">{t.activas}</p>
                    <p className="text-gray-500 text-xs">Activas</p>
                  </div>
                  <div className="bg-green-50 rounded-lg py-2">
                    <p className="text-xl font-bold text-green-700">{t.listas}</p>
                    <p className="text-gray-500 text-xs">Listas</p>
                  </div>
                </div>
                {t.facturado > 0 && (
                  <div className="mt-2 bg-gray-50 rounded-lg py-1.5 text-center">
                    <p className="text-xs text-gray-500">Presupuestado</p>
                    <p className="font-bold text-gray-800 text-xs">{formatCLP(t.facturado)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

