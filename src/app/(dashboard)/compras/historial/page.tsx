import { createClient } from '@/lib/supabase/server'
import { formatCLP } from '@/lib/calculations'
import Link from 'next/link'
import ComprobanteGallery from '@/components/compras/ComprobanteGallery'

const TZ = 'America/Santiago'

const ESTADO_INFO: Record<string, { label: string; color: string; icon: string }> = {
  pendiente:           { label: 'Pendiente',          color: 'bg-yellow-100 text-yellow-800',  icon: '🕐' },
  enviada:             { label: 'Enviada',             color: 'bg-purple-100 text-purple-800',  icon: '📤' },
  proveedor_respondio: { label: 'Proveedor respondió', color: 'bg-teal-100 text-teal-800',      icon: '💬' },
  confirmada:          { label: 'Confirmada',          color: 'bg-indigo-100 text-indigo-800',  icon: '✅' },
  en_transito:         { label: 'En tránsito',         color: 'bg-blue-100 text-blue-800',      icon: '🚚' },
  recibida_parcial:    { label: 'Recibida parcial',    color: 'bg-orange-100 text-orange-800',  icon: '⚠️' },
  recibida_completa:   { label: 'Completa ✓',          color: 'bg-green-100 text-green-800',    icon: '✅' },
  cancelada:           { label: 'Cancelada',           color: 'bg-red-100 text-red-800',        icon: '❌' },
}

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia',
  debito: 'Débito', credito: 'Crédito',
}

export default async function HistorialComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; estado?: string; q?: string; pago?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90)
  const hace90Str = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(hace90)

  const desde  = params.desde  ?? hace90Str
  const hasta  = params.hasta  ?? hoy
  const estado = params.estado ?? ''
  const q      = params.q      ?? ''
  const pago   = params.pago   ?? ''  // 'con_comprobante' | 'sin_comprobante' | ''

  let ocQuery = supabase
    .from('purchase_orders')
    .select(`
      id, numero_oc, estado, total, metodo_pago, monto_pagado, created_at,
      fecha_recepcion, numero_factura_proveedor, comprobante_pago_urls,
      suppliers(nombre),
      purchase_order_items(
        id, nombre, cantidad_solicitada, cantidad_recibida,
        precio_unitario, precio_aceptado, precio_cotizado, product_id
      )
    `)
    .gte('created_at', `${desde}T00:00:00`)
    .lte('created_at', `${hasta}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(300)

  if (estado) ocQuery = ocQuery.eq('estado', estado)

  const { data: ocs } = await ocQuery

  type ItemOC = {
    id: string; nombre: string; cantidad_solicitada: number; cantidad_recibida: number
    precio_unitario: number; precio_aceptado?: number | null; precio_cotizado?: number | null
    product_id: string | null
  }

  type OC = {
    id: string; numero_oc: string; estado: string; total: number
    metodo_pago?: string | null; monto_pagado?: number | null
    created_at: string; fecha_recepcion: string | null
    numero_factura_proveedor: string | null; comprobante_pago_urls?: string[] | null
    suppliers: { nombre: string } | { nombre: string }[] | null
    purchase_order_items: ItemOC[]
  }

  let lista = (ocs ?? []) as OC[]

  // Filtro texto
  if (q.trim()) {
    const t = q.toLowerCase()
    lista = lista.filter(oc => {
      const sup = Array.isArray(oc.suppliers) ? oc.suppliers[0] : oc.suppliers
      return oc.numero_oc.toLowerCase().includes(t) ||
        sup?.nombre.toLowerCase().includes(t) ||
        (oc.numero_factura_proveedor ?? '').toLowerCase().includes(t) ||
        oc.purchase_order_items?.some(i => i.nombre.toLowerCase().includes(t))
    })
  }

  // Filtro comprobante
  if (pago === 'con_comprobante') {
    lista = lista.filter(oc => (oc.comprobante_pago_urls?.length ?? 0) > 0)
  } else if (pago === 'sin_comprobante') {
    lista = lista.filter(oc =>
      ['recibida_completa', 'recibida_parcial'].includes(oc.estado) &&
      !(oc.comprobante_pago_urls?.length)
    )
  }

  // Movimientos de stock
  const ocIds = lista.map(oc => oc.id)
  const { data: movimientos } = ocIds.length
    ? await supabase
        .from('stock_movements')
        .select('referencia_id, nombre_usuario, created_at')
        .eq('referencia_tipo', 'purchase_order')
        .in('referencia_id', ocIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const movPorOC: Record<string, { nombre_usuario: string | null; created_at: string }[]> = {}
  ;(movimientos ?? []).forEach(m => {
    const rid = m.referencia_id as string
    if (!movPorOC[rid]) movPorOC[rid] = []
    movPorOC[rid].push({ nombre_usuario: m.nombre_usuario as string | null, created_at: m.created_at as string })
  })

  // Estadísticas
  const totalOCs       = lista.length
  const totalMonto     = lista.reduce((s, oc) => s + (oc.total ?? 0), 0)
  const conComprobante = lista.filter(oc => (oc.comprobante_pago_urls?.length ?? 0) > 0).length
  const sinComprobante = lista.filter(oc =>
    ['recibida_completa', 'recibida_parcial'].includes(oc.estado) &&
    !(oc.comprobante_pago_urls?.length)
  ).length
  const parciales      = lista.filter(oc => oc.estado === 'recibida_parcial').length

  function buildUrl(updates: Record<string, string>) {
    const p = new URLSearchParams({
      desde, hasta,
      ...(estado && { estado }),
      ...(q && { q }),
      ...(pago && { pago }),
    })
    Object.entries(updates).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `/compras/historial?${p.toString()}`
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/compras" className="text-blue-600 hover:underline">← Compras</Link>
            <span className="text-gray-300">/</span>
            <Link href="/inventario/movimientos" className="text-blue-600 hover:underline">📋 Movimientos stock</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">🧾 Registro de compras y pagos</h1>
          <p className="text-sm text-gray-500">Historial de órdenes, recepciones y verificación de comprobantes</p>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosClient desde={desde} hasta={hasta} estado={estado} q={q} pago={pago} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Total OCs</p>
          <p className="text-2xl font-bold text-gray-800">{totalOCs}</p>
          <p className="text-xs text-gray-400">{formatCLP(totalMonto)}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
          <p className="text-xs text-green-700 mb-1">Con comprobante</p>
          <p className="text-2xl font-bold text-green-700">{conComprobante}</p>
          <p className="text-xs text-green-500">pago verificado</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${sinComprobante > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs mb-1 ${sinComprobante > 0 ? 'text-red-700' : 'text-gray-500'}`}>Sin comprobante</p>
          <p className={`text-2xl font-bold ${sinComprobante > 0 ? 'text-red-700' : 'text-gray-400'}`}>{sinComprobante}</p>
          <p className={`text-xs ${sinComprobante > 0 ? 'text-red-500' : 'text-gray-400'}`}>recibidas sin pago doc.</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${parciales > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs mb-1 ${parciales > 0 ? 'text-orange-700' : 'text-gray-500'}`}>Recepción parcial</p>
          <p className={`text-2xl font-bold ${parciales > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{parciales}</p>
          <p className={`text-xs ${parciales > 0 ? 'text-orange-500' : 'text-gray-400'}`}>ítems pendientes</p>
        </div>
      </div>

      {/* Filtros rápidos por estado */}
      <div className="flex flex-wrap gap-2">
        <Link href={buildUrl({ estado: '', pago: pago })}>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${!estado ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
            Todos ({totalOCs})
          </span>
        </Link>
        {Object.entries(ESTADO_INFO).map(([k, v]) => {
          const count = lista.filter(oc => oc.estado === k).length
          return count > 0 ? (
            <Link key={k} href={buildUrl({ estado: estado === k ? '' : k, pago: pago })}>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${estado === k ? 'ring-2 ring-blue-400' : ''} ${v.color}`}>
                {v.icon} {v.label} ({count})
              </span>
            </Link>
          ) : null
        })}
      </div>

      {/* Filtros comprobante */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium">Pago:</span>
        {[
          { val: '', label: 'Todos' },
          { val: 'con_comprobante', label: '✅ Con comprobante' },
          { val: 'sin_comprobante', label: '⚠️ Sin comprobante' },
        ].map(opt => (
          <Link key={opt.val} href={buildUrl({ pago: pago === opt.val ? '' : opt.val })}>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${pago === opt.val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
              {opt.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Lista de OCs */}
      <div className="space-y-3">
        {lista.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400 text-sm">
            Sin órdenes en el período seleccionado
          </div>
        ) : lista.map(oc => {
          const sup = Array.isArray(oc.suppliers) ? oc.suppliers[0] : oc.suppliers
          const estadoInfo = ESTADO_INFO[oc.estado] ?? { label: oc.estado, color: 'bg-gray-100 text-gray-700', icon: '•' }
          const movs = movPorOC[oc.id] ?? []
          const receptores = [...new Set(movs.map(m => m.nombre_usuario).filter(Boolean))]
          const fechaRecep = movs.length
            ? new Date(movs[movs.length - 1].created_at).toLocaleString('es-CL', {
                timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })
            : null
          const totalItems     = oc.purchase_order_items?.length ?? 0
          const itemsRecibidos = oc.purchase_order_items?.filter(i => i.cantidad_recibida > 0).length ?? 0
          const comprobantes   = (oc.comprobante_pago_urls ?? []).filter(Boolean)
          const esParcial      = oc.estado === 'recibida_parcial'

          return (
            <div key={oc.id} className={`bg-white rounded-xl border overflow-hidden ${esParcial ? 'border-orange-200' : ''}`}>
              {/* Header OC */}
              <div className={`px-4 py-3 flex items-start justify-between gap-3 border-b ${esParcial ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <Link href={`/compras/orden/${oc.id}`} className="font-mono font-bold text-blue-700 hover:underline text-sm shrink-0">
                    {oc.numero_oc}
                  </Link>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${estadoInfo.color}`}>
                    {estadoInfo.icon} {estadoInfo.label}
                  </span>
                  <span className="text-sm text-gray-600 truncate">{sup?.nombre ?? '—'}</span>
                  {oc.numero_factura_proveedor && (
                    <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                      Factura: {oc.numero_factura_proveedor}
                    </span>
                  )}
                  {oc.metodo_pago && (
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${oc.metodo_pago === 'credito' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      💳 {METODO_LABELS[oc.metodo_pago] ?? oc.metodo_pago}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">{formatCLP(oc.total ?? 0)}</p>
                  <p className="text-xs text-gray-400">
                    {new Intl.DateTimeFormat('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(oc.created_at))}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y">
                {(oc.purchase_order_items ?? []).map(item => {
                  const completo = item.cantidad_recibida >= item.cantidad_solicitada
                  const parcial  = item.cantidad_recibida > 0 && !completo
                  const precioFinal = item.precio_aceptado ?? item.precio_cotizado ?? item.precio_unitario
                  return (
                    <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-400">{formatCLP(precioFinal)} c/u</p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Ped: <span className="font-semibold text-gray-800">{item.cantidad_solicitada}</span></span>
                          <span className="text-gray-300">|</span>
                          <span className={completo ? 'text-green-700 font-semibold' : parcial ? 'text-orange-600 font-semibold' : 'text-gray-400'}>
                            Rec: {item.cantidad_recibida}{completo && ' ✓'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{formatCLP(precioFinal * item.cantidad_solicitada)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className={`px-4 py-2.5 border-t flex items-center justify-between gap-3 flex-wrap ${
                oc.estado === 'recibida_completa' ? 'bg-green-50' :
                oc.estado === 'recibida_parcial'  ? 'bg-orange-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500">
                    {itemsRecibidos}/{totalItems} ítems recibidos
                  </span>
                  {esParcial && (
                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      ⚠️ Entrega incompleta
                    </span>
                  )}
                  {receptores.length > 0 && (
                    <span className="text-xs text-gray-600">👤 {receptores.join(', ')}</span>
                  )}
                  {fechaRecep && (
                    <span className="text-xs text-gray-400">🕐 {fechaRecep}</span>
                  )}

                  {/* Comprobantes */}
                  {comprobantes.length > 0 ? (
                    <ComprobanteGallery urls={comprobantes} size="sm" label />
                  ) : (
                    ['recibida_completa', 'recibida_parcial'].includes(oc.estado) && (
                      <Link href={`/compras/orden/${oc.id}`}
                        className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
                        ⚠️ Sin comprobante de pago
                      </Link>
                    )
                  )}
                </div>
                <Link href={`/compras/orden/${oc.id}`}
                  className="text-blue-600 hover:underline font-medium text-xs shrink-0">
                  Ver detalle →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FiltrosClient({ desde, hasta, estado, q, pago }: {
  desde: string; hasta: string; estado: string; q: string; pago: string
}) {
  return (
    <>
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Desde</label>
            <input id="fc-desde" type="date" defaultValue={desde}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Hasta</label>
            <input id="fc-hasta" type="date" defaultValue={hasta}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex-1 min-w-40 space-y-1">
            <label className="text-xs text-gray-500 font-medium">Buscar (N° OC, proveedor, factura, producto)</label>
            <input id="fc-q" type="text" defaultValue={q} placeholder="Buscar..."
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const base = '/compras/historial';
            function nav() {
              const d = document.getElementById('fc-desde')?.value || '${desde}';
              const h = document.getElementById('fc-hasta')?.value || '${hasta}';
              const qq = document.getElementById('fc-q')?.value || '';
              const p = new URLSearchParams({ desde: d, hasta: h });
              if ('${estado}') p.set('estado', '${estado}');
              if ('${pago}') p.set('pago', '${pago}');
              if (qq) p.set('q', qq);
              window.location = base + '?' + p.toString();
            }
            ['fc-desde','fc-hasta'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.addEventListener('change', nav);
            });
            const qEl = document.getElementById('fc-q');
            if (qEl) {
              let t; qEl.addEventListener('input', function() { clearTimeout(t); t = setTimeout(nav, 600); });
            }
          })();
        `
      }} />
    </>
  )
}
