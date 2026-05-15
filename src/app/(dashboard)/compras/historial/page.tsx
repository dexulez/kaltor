import { createClient } from '@/lib/supabase/server'
import { formatCLP } from '@/lib/calculations'
import Link from 'next/link'

const TZ = 'America/Santiago'

const ESTADO_INFO: Record<string, { label: string; color: string }> = {
  pendiente:          { label: 'Pendiente',       color: 'bg-yellow-100 text-yellow-800' },
  en_transito:        { label: 'En tránsito',     color: 'bg-blue-100 text-blue-800' },
  recibida_parcial:   { label: 'Parcial',         color: 'bg-orange-100 text-orange-800' },
  recibida_completa:  { label: 'Completa ✓',      color: 'bg-green-100 text-green-800' },
  cancelada:          { label: 'Cancelada',       color: 'bg-red-100 text-red-800' },
}

export default async function HistorialComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; estado?: string; q?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90)
  const hace90Str = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(hace90)

  const desde  = params.desde ?? hace90Str
  const hasta  = params.hasta ?? hoy
  const estado = params.estado ?? ''
  const q      = params.q ?? ''

  // Órdenes de compra con sus items y movimientos
  let ocQuery = supabase
    .from('purchase_orders')
    .select(`
      id, numero_oc, estado, total, created_at, fecha_recepcion, numero_factura_proveedor,
      suppliers(nombre),
      purchase_order_items(
        id, nombre, cantidad_solicitada, cantidad_recibida, precio_unitario, product_id
      )
    `)
    .gte('created_at', `${desde}T00:00:00`)
    .lte('created_at', `${hasta}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(200)

  if (estado) ocQuery = ocQuery.eq('estado', estado)

  const { data: ocs } = await ocQuery

  type OC = {
    id: string; numero_oc: string; estado: string; total: number; created_at: string
    fecha_recepcion: string | null; numero_factura_proveedor: string | null
    suppliers: { nombre: string } | { nombre: string }[] | null
    purchase_order_items: {
      id: string; nombre: string; cantidad_solicitada: number; cantidad_recibida: number
      precio_unitario: number; product_id: string | null
    }[]
  }

  let lista = (ocs ?? []) as OC[]
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

  // Buscar movimientos de stock para estas OCs (para ver quién recibió)
  const ocIds = lista.map(oc => oc.id)
  const { data: movimientos } = ocIds.length
    ? await supabase
        .from('stock_movements')
        .select('referencia_id, nombre_usuario, usuario_id, created_at')
        .eq('referencia_tipo', 'purchase_order')
        .in('referencia_id', ocIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Agrupar movimientos por OC
  const movPorOC: Record<string, { nombre_usuario: string | null; created_at: string }[]> = {}
  ;(movimientos ?? []).forEach(m => {
    const rid = m.referencia_id as string
    if (!movPorOC[rid]) movPorOC[rid] = []
    movPorOC[rid].push({ nombre_usuario: m.nombre_usuario as string | null, created_at: m.created_at as string })
  })

  // Estadísticas
  const totalOCs      = lista.length
  const totalMonto    = lista.reduce((s, oc) => s + (oc.total ?? 0), 0)
  const totalRecibidas = lista.filter(oc => oc.estado === 'recibida_completa').length
  const pendientes    = lista.filter(oc => oc.estado === 'pendiente' || oc.estado === 'en_transito').length

  function buildUrl(updates: Record<string, string>) {
    const p = new URLSearchParams({ desde, hasta, ...(estado && { estado }), ...(q && { q }) })
    Object.entries(updates).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `/compras/historial?${p.toString()}`
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/compras" className="text-sm text-blue-600 hover:underline">← Compras</Link>
            <span className="text-gray-300">/</span>
            <Link href="/inventario/movimientos" className="text-sm text-blue-600 hover:underline">📋 Movimientos stock</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">🛒 Historial de compras</h1>
          <p className="text-sm text-gray-500">Trazabilidad completa de órdenes de compra, recepciones y usuarios</p>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosClient desde={desde} hasta={hasta} estado={estado} q={q} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-500">Total OCs</p>
          <p className="text-2xl font-bold text-gray-800">{totalOCs}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-500">Monto total</p>
          <p className="text-lg font-bold text-blue-700">{formatCLP(totalMonto)}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
          <p className="text-xs text-green-700">Recibidas completo</p>
          <p className="text-2xl font-bold text-green-700">{totalRecibidas}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3 text-center">
          <p className="text-xs text-yellow-700">Pendientes/tránsito</p>
          <p className="text-2xl font-bold text-yellow-700">{pendientes}</p>
        </div>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2">
        <Link href={buildUrl({ estado: '', page: '1' })}>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-colors ${!estado ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
            Todos ({totalOCs})
          </span>
        </Link>
        {Object.entries(ESTADO_INFO).map(([k, v]) => {
          const count = lista.filter(oc => oc.estado === k).length
          return count > 0 ? (
            <Link key={k} href={buildUrl({ estado: estado === k ? '' : k })}>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${estado === k ? 'ring-2 ring-blue-400' : ''} ${v.color}`}>
                {v.label} ({count})
              </span>
            </Link>
          ) : null
        })}
      </div>

      {/* Lista de OCs */}
      <div className="space-y-3">
        {lista.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400 text-sm">
            Sin órdenes de compra en el período seleccionado
          </div>
        ) : lista.map(oc => {
          const sup = Array.isArray(oc.suppliers) ? oc.suppliers[0] : oc.suppliers
          const estadoInfo = ESTADO_INFO[oc.estado] ?? { label: oc.estado, color: 'bg-gray-100 text-gray-700' }
          const movs = movPorOC[oc.id] ?? []
          const receptores = [...new Set(movs.map(m => m.nombre_usuario).filter(Boolean))]
          const fechaRecep = movs.length
            ? new Date(movs[movs.length - 1].created_at).toLocaleString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : null
          const totalItems = oc.purchase_order_items?.length ?? 0
          const itemsRecibidos = oc.purchase_order_items?.filter(i => i.cantidad_recibida > 0).length ?? 0

          return (
            <div key={oc.id} className="bg-white rounded-xl border overflow-hidden">
              {/* Header de la OC */}
              <div className="px-4 py-3 flex items-start justify-between gap-3 border-b bg-gray-50">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link href={`/compras/orden/${oc.id}`} className="font-mono font-bold text-blue-700 hover:underline text-sm">
                    {oc.numero_oc}
                  </Link>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                    {estadoInfo.label}
                  </span>
                  <span className="text-sm text-gray-600">{sup?.nombre ?? '—'}</span>
                  {oc.numero_factura_proveedor && (
                    <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                      Factura: {oc.numero_factura_proveedor}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">{formatCLP(oc.total ?? 0)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(oc.created_at).toLocaleString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Detalle de items */}
              <div className="divide-y">
                {(oc.purchase_order_items ?? []).map(item => {
                  const completo = item.cantidad_recibida >= item.cantidad_solicitada
                  const parcial  = item.cantidad_recibida > 0 && !completo
                  return (
                    <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-400">{formatCLP(item.precio_unitario)} c/u</p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Pedido: <span className="font-semibold text-gray-800">{item.cantidad_solicitada}</span></span>
                          <span className="text-gray-300">|</span>
                          <span className={completo ? 'text-green-700 font-semibold' : parcial ? 'text-orange-600 font-semibold' : 'text-gray-400'}>
                            Recibido: {item.cantidad_recibida}
                            {completo && ' ✓'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 text-right">{formatCLP(item.precio_unitario * item.cantidad_solicitada)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer con recepción */}
              <div className={`px-4 py-2.5 flex items-center justify-between gap-3 text-xs border-t ${
                oc.estado === 'recibida_completa' ? 'bg-green-50' :
                oc.estado === 'recibida_parcial'  ? 'bg-orange-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-gray-500">
                    {itemsRecibidos}/{totalItems} ítems recibidos
                  </span>
                  {receptores.length > 0 && (
                    <span className="text-gray-700 font-medium">
                      👤 Recibido por: {receptores.join(', ')}
                    </span>
                  )}
                  {fechaRecep && (
                    <span className="text-gray-500">🕐 {fechaRecep}</span>
                  )}
                  {movs.length === 0 && oc.estado !== 'pendiente' && oc.estado !== 'en_transito' && (
                    <span className="text-amber-600 italic">Sin registro de usuario (recepción anterior al sistema de auditoría)</span>
                  )}
                </div>
                <Link href={`/compras/orden/${oc.id}`}
                  className="text-blue-600 hover:underline font-medium shrink-0">Ver detalle →</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FiltrosClient({ desde, hasta, estado, q }: { desde: string; hasta: string; estado: string; q: string }) {
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
