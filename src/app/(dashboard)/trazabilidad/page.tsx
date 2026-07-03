import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Evento = {
  id: string
  tipo: 'venta' | 'ot_estado' | 'stock'
  fecha: string
  usuario: string | null
  titulo: string
  detalle: string
  monto?: number
}

const TIPO_META: Record<Evento['tipo'], { icon: string; color: string; bg: string }> = {
  venta:    { icon: '🛒', color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  ot_estado:{ icon: '🔧', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  stock:    { icon: '📦', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
}

function formatMonto(n: number) {
  return '$' + n.toLocaleString('es-CL')
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoy.toDateString()) return `Hoy ${hora}`
  if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora}`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) + ' ' + hora
}

export default async function TrazabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; desde?: string; hasta?: string; usuario?: string }>
}) {
  const { tipo: tipoFiltro, desde, hasta, usuario: usuarioFiltro } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('store_id')
    .eq('id', user!.id)
    .single()
  const storeId = perfil?.store_id

  const ahora = new Date()
  const desdeFiltro = desde || new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const hastaFiltro = hasta || ahora.toISOString().slice(0, 10)
  const desdeIso = desdeFiltro + 'T00:00:00'
  const hastaIso = hastaFiltro + 'T23:59:59'

  // ── Ventas ────────────────────────────────────────────────────────────────────
  const ventasQ = supabase
    .from('sales')
    .select('id, numero_venta, total, metodo_pago, tipo_documento, created_at, anulada, usuario_id, customers(nombre), user_profiles(nombre_completo)')
    .eq('store_id', storeId)
    .gte('created_at', desdeIso)
    .lte('created_at', hastaIso)
    .order('created_at', { ascending: false })
    .limit(200)

  // ── Cambios de estado OT ──────────────────────────────────────────────────────
  const otQ = supabase
    .from('repair_status_history')
    .select('id, estado_anterior, estado_nuevo, comentario, created_at, usuario_id, repair_orders(numero_ot), user_profiles(nombre_completo)')
    .eq('store_id', storeId)
    .gte('created_at', desdeIso)
    .lte('created_at', hastaIso)
    .order('created_at', { ascending: false })
    .limit(200)

  // ── Movimientos de stock ──────────────────────────────────────────────────────
  const stockQ = supabase
    .from('stock_movements')
    .select('id, tipo, cantidad, razon, referencia_tipo, created_at, products(nombre), user_profiles(nombre_completo)')
    .eq('store_id', storeId)
    .gte('created_at', desdeIso)
    .lte('created_at', hastaIso)
    .order('created_at', { ascending: false })
    .limit(200)

  const [{ data: ventas }, { data: otCambios }, { data: stockMovs }] = await Promise.all([ventasQ, otQ, stockQ])

  // ── Construir timeline unificado ──────────────────────────────────────────────
  const eventos: Evento[] = []

  for (const v of ventas ?? []) {
    const up = v.user_profiles as { nombre_completo?: string } | null
    const cliente = (v.customers as { nombre?: string } | null)?.nombre ?? 'Sin cliente'
    eventos.push({
      id: v.id,
      tipo: 'venta',
      fecha: v.created_at,
      usuario: up?.nombre_completo ?? null,
      titulo: v.anulada
        ? `Venta ${v.numero_venta} ANULADA`
        : `Venta ${v.numero_venta} · ${cliente}`,
      detalle: [v.tipo_documento, v.metodo_pago].filter(Boolean).join(' · '),
      monto: v.total,
    })
  }

  for (const ot of otCambios ?? []) {
    const up = ot.user_profiles as { nombre_completo?: string } | null
    const ro = ot.repair_orders as { numero_ot?: string } | null
    eventos.push({
      id: ot.id,
      tipo: 'ot_estado',
      fecha: ot.created_at,
      usuario: up?.nombre_completo ?? null,
      titulo: `OT ${ro?.numero_ot ?? '?'}: ${ot.estado_anterior ?? '—'} → ${ot.estado_nuevo}`,
      detalle: ot.comentario ?? '',
    })
  }

  for (const sm of stockMovs ?? []) {
    const up = sm.user_profiles as { nombre_completo?: string } | null
    const prod = sm.products as { nombre?: string } | null
    eventos.push({
      id: sm.id,
      tipo: 'stock',
      fecha: sm.created_at,
      usuario: up?.nombre_completo ?? null,
      titulo: `${sm.tipo === 'entrada' ? '↑ Entrada' : '↓ Salida'} · ${prod?.nombre ?? 'Producto'}`,
      detalle: [
        `Cant: ${sm.cantidad > 0 ? '+' : ''}${sm.cantidad}`,
        sm.razon,
        sm.referencia_tipo,
      ].filter(Boolean).join(' · '),
    })
  }

  // Filtrar por tipo si viene en searchParams
  const eventosFiltrados = eventos
    .filter(e => !tipoFiltro || tipoFiltro === 'todos' || e.tipo === tipoFiltro)
    .filter(e => !usuarioFiltro || e.usuario?.toLowerCase().includes(usuarioFiltro.toLowerCase()))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  // Usuarios únicos para el filtro
  const usuariosUnicos = [...new Set(eventos.map(e => e.usuario).filter(Boolean) as string[])].sort()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trazabilidad</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Registro de actividad: ventas, cambios de estado en OTs y movimientos de stock
        </p>
      </div>

      {/* Filtros */}
      <form method="GET" className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desdeFiltro}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hastaFiltro}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
          <select
            name="tipo"
            defaultValue={tipoFiltro ?? 'todos'}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="todos">Todos</option>
            <option value="venta">🛒 Ventas</option>
            <option value="ot_estado">🔧 Cambios OT</option>
            <option value="stock">📦 Stock</option>
          </select>
        </div>
        {usuariosUnicos.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Usuario</label>
            <select
              name="usuario"
              defaultValue={usuarioFiltro ?? ''}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Todos</option>
              {usuariosUnicos.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          Filtrar
        </button>
      </form>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {eventos.filter(e => e.tipo === 'venta').length}
          </p>
          <p className="text-xs text-green-600 font-medium mt-0.5">Ventas</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">
            {eventos.filter(e => e.tipo === 'ot_estado').length}
          </p>
          <p className="text-xs text-blue-600 font-medium mt-0.5">Cambios OT</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-700">
            {eventos.filter(e => e.tipo === 'stock').length}
          </p>
          <p className="text-xs text-orange-600 font-medium mt-0.5">Mov. Stock</p>
        </div>
      </div>

      {/* Timeline */}
      {eventosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-gray-700">Sin actividad en el período</p>
          <p className="text-sm text-gray-400 mt-1">Cambia los filtros o amplía el rango de fechas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">Más reciente primero</p>
          </div>
          {eventosFiltrados.map(evento => {
            const meta = TIPO_META[evento.tipo]
            return (
              <div key={`${evento.tipo}-${evento.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                {/* Icono */}
                <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center text-lg ${meta.bg}`}>
                  {meta.icon}
                </div>

                {/* Contenido */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${meta.color} truncate`}>
                    {evento.titulo}
                  </p>
                  {evento.detalle && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{evento.detalle}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {evento.usuario ? <span className="font-medium text-gray-600">{evento.usuario}</span> : <span className="italic">Sistema</span>}
                    {' · '}
                    {formatFecha(evento.fecha)}
                  </p>
                </div>

                {/* Monto (solo ventas) */}
                {evento.monto != null && (
                  <p className="shrink-0 text-sm font-bold text-green-700">
                    {formatMonto(evento.monto)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
