import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import FiltrosMovimientos from '@/components/inventario/FiltrosMovimientos'

const TZ = 'America/Santiago'

const TIPO_INFO: Record<string, { label: string; color: string; icono: string }> = {
  entrada:          { label: 'Recepción OC',  color: 'bg-green-100 text-green-800',   icono: '📦' },
  salida:           { label: 'Venta',          color: 'bg-red-100 text-red-800',       icono: '🛒' },
  ajuste_positivo:  { label: 'Ajuste (+)',     color: 'bg-blue-100 text-blue-800',     icono: '➕' },
  ajuste_negativo:  { label: 'Ajuste (−)',     color: 'bg-orange-100 text-orange-800', icono: '➖' },
  carga_inicial:    { label: 'Carga inicial',  color: 'bg-purple-100 text-purple-800', icono: '📥' },
  ajuste:           { label: 'Ajuste',         color: 'bg-yellow-100 text-yellow-800', icono: '✏️' },
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; tipo?: string; q?: string; page?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
  const hace30Str = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(hace30)

  const desde = params.desde ?? hace30Str
  const hasta  = params.hasta ?? hoy
  const tipo   = params.tipo ?? ''
  const q      = params.q ?? ''
  const page   = Math.max(1, parseInt(params.page ?? '1'))
  const limit  = 100
  const offset = (page - 1) * limit

  // ── Paso 1: movimientos (columnas base, sin joins) ───────────────────────
  type MovRaw = {
    id: string; tipo: string; cantidad: number
    stock_anterior: number; stock_nuevo: number
    razon: string | null; referencia_id: string | null; referencia_tipo: string | null
    product_id: string | null; usuario_id: string | null
    nombre_usuario: string | null; created_at: string
  }

  let movBase: MovRaw[] = []
  try {
    let query = supabase
      .from('stock_movements')
      .select('id, tipo, cantidad, stock_anterior, stock_nuevo, razon, referencia_id, referencia_tipo, product_id, usuario_id, nombre_usuario, created_at')
      .gte('created_at', `${desde}T00:00:00`)
      .lte('created_at', `${hasta}T23:59:59`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (tipo) query = query.eq('tipo', tipo)
    const { data, error } = await query

    if (error) {
      // Columnas nuevas no existen aún → reintentar sin ellas
      let query2 = supabase
        .from('stock_movements')
        .select('id, tipo, cantidad, stock_anterior, stock_nuevo, razon, referencia_id, referencia_tipo, product_id, created_at')
        .gte('created_at', `${desde}T00:00:00`)
        .lte('created_at', `${hasta}T23:59:59`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (tipo) query2 = query2.eq('tipo', tipo)
      const { data: d2 } = await query2
      movBase = (d2 ?? []).map(m => ({
        ...(m as Omit<MovRaw, 'usuario_id' | 'nombre_usuario'>),
        usuario_id: null, nombre_usuario: null,
      }))
    } else {
      movBase = (data ?? []) as unknown as MovRaw[]
    }
  } catch {
    movBase = []
  }

  // ── Paso 2: nombres de productos ─────────────────────────────────────────
  const prodIds = [...new Set(movBase.map(m => m.product_id).filter(Boolean))] as string[]
  const prodMap: Record<string, { id: string; nombre: string; sku: string | null }> = {}
  if (prodIds.length) {
    const { data } = await supabase.from('products').select('id, nombre, sku').in('id', prodIds)
    ;(data ?? []).forEach((p: { id: string; nombre: string; sku?: string | null }) => {
      prodMap[p.id] = { id: p.id, nombre: p.nombre, sku: p.sku ?? null }
    })
  }

  // ── Paso 3: nombres de usuarios ──────────────────────────────────────────
  const userIds = [...new Set(movBase.map(m => m.usuario_id).filter(Boolean))] as string[]
  const userMap: Record<string, string> = {}
  if (userIds.length) {
    const { data } = await supabase.from('user_profiles').select('id, nombre_completo').in('id', userIds)
    ;(data ?? []).forEach((u: { id: string; nombre_completo: string }) => { userMap[u.id] = u.nombre_completo })
  }

  // ── Combinar ─────────────────────────────────────────────────────────────
  type MovFinal = MovRaw & {
    prod: { id: string; nombre: string; sku: string | null } | null
    userName: string | null
  }

  let movList: MovFinal[] = movBase.map(m => ({
    ...m,
    prod: m.product_id ? (prodMap[m.product_id] ?? null) : null,
    userName: m.nombre_usuario ?? (m.usuario_id ? (userMap[m.usuario_id] ?? null) : null),
  }))

  // Filtro de búsqueda
  if (q.trim()) {
    const term = q.toLowerCase()
    movList = movList.filter(m =>
      (m.prod?.nombre ?? '').toLowerCase().includes(term) ||
      (m.prod?.sku ?? '').toLowerCase().includes(term) ||
      (m.razon ?? '').toLowerCase().includes(term) ||
      (m.userName ?? '').toLowerCase().includes(term)
    )
  }

  const totalEntradas = movList.filter(m => ['entrada', 'carga_inicial', 'ajuste_positivo'].includes(m.tipo)).reduce((s, m) => s + m.cantidad, 0)
  const totalSalidas  = movList.filter(m => ['salida', 'ajuste_negativo'].includes(m.tipo)).reduce((s, m) => s + m.cantidad, 0)
  const totalAjustes  = movList.filter(m => m.tipo === 'ajuste').length

  function pageUrl(p: number) {
    const sp = new URLSearchParams({ desde, hasta })
    if (tipo) sp.set('tipo', tipo)
    if (q) sp.set('q', q)
    if (p > 1) sp.set('page', String(p))
    return `/inventario/movimientos?${sp.toString()}`
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/inventario" className="text-sm text-blue-600 hover:underline">← Inventario</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">📋 Movimientos de inventario</h1>
          <p className="text-sm text-gray-500">Trazabilidad completa: quién, cuándo y por qué cambió el stock</p>
        </div>
        <Link href="/compras/historial"
          className="text-sm text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-xl font-medium">
          🛒 Historial de compras →
        </Link>
      </div>

      {/* Filtros — componente cliente */}
      <Suspense>
        <FiltrosMovimientos desde={desde} hasta={hasta} tipo={tipo} q={q} />
      </Suspense>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-500">Movimientos</p>
          <p className="text-2xl font-bold text-gray-800">{movList.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
          <p className="text-xs text-green-700">Unidades entradas</p>
          <p className="text-2xl font-bold text-green-700">+{totalEntradas}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
          <p className="text-xs text-red-700">Unidades salidas</p>
          <p className="text-2xl font-bold text-red-700">−{totalSalidas}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3 text-center">
          <p className="text-xs text-yellow-700">Ajustes manuales</p>
          <p className="text-2xl font-bold text-yellow-700">{totalAjustes}</p>
        </div>
      </div>

      {/* Filtros rápidos por tipo */}
      <div className="flex flex-wrap gap-2">
        <Link href={pageUrl(1)} onClick={() => {}}>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-medium border cursor-pointer ${!tipo ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
            Todos ({movBase.length})
          </span>
        </Link>
        {Object.entries(TIPO_INFO).map(([k, v]) => {
          const count = movBase.filter(m => m.tipo === k).length
          if (!count) return null
          const sp = new URLSearchParams({ desde, hasta, tipo: tipo === k ? '' : k })
          if (q) sp.set('q', q)
          return (
            <Link key={k} href={`/inventario/movimientos?${sp.toString()}`}>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-medium border cursor-pointer ${tipo === k ? 'ring-2 ring-blue-400' : ''} ${v.color}`}>
                {v.icono} {v.label} ({count})
              </span>
            </Link>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha / Hora', 'Tipo', 'Producto', 'Cant.', 'Ant.', 'Nuevo', 'Razón', 'Usuario'].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {movList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Sin movimientos en el período seleccionado
                  </td>
                </tr>
              ) : movList.map(m => {
                const info = TIPO_INFO[m.tipo] ?? { label: m.tipo, color: 'bg-gray-100 text-gray-700', icono: '📋' }
                const esEntrada = ['entrada', 'carga_inicial', 'ajuste_positivo'].includes(m.tipo)
                const esSalida  = ['salida', 'ajuste_negativo'].includes(m.tipo)
                const fechaHora = new Date(m.created_at).toLocaleString('es-CL', {
                  timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">{fechaHora}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                        {info.icono} {info.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {m.prod ? (
                        <div>
                          <Link href={`/inventario/${m.prod.id}/editar`}
                            className="font-medium text-gray-900 hover:text-blue-700 hover:underline text-sm">
                            {m.prod.nombre}
                          </Link>
                          {m.prod.sku && <p className="text-xs text-gray-400">{m.prod.sku}</p>}
                        </div>
                      ) : <span className="text-gray-400 text-xs italic">Producto eliminado</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold text-sm ${esEntrada ? 'text-green-700' : esSalida ? 'text-red-700' : 'text-yellow-700'}`}>
                        {esEntrada ? '+' : esSalida ? '−' : '±'}{m.cantidad}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-500 font-mono">{m.stock_anterior}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-bold text-sm font-mono ${esEntrada ? 'text-green-700' : esSalida ? 'text-red-700' : 'text-gray-700'}`}>
                        {m.stock_nuevo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 max-w-xs">
                      <p className="truncate">{m.razon ?? '—'}</p>
                      {m.referencia_tipo === 'purchase_order' && m.referencia_id && (
                        <Link href={`/compras/orden/${m.referencia_id}`} className="text-blue-600 hover:underline text-xs">Ver OC →</Link>
                      )}
                      {m.referencia_tipo === 'carga_masiva' && <span className="text-purple-600 text-xs">CSV import</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {m.userName
                        ? <span className="text-gray-700 font-medium">{m.userName}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="border-t px-4 py-3 flex justify-between items-center bg-gray-50">
          <span className="text-xs text-gray-500">
            {movList.length === limit ? `${offset + 1}–${offset + movList.length} (hay más)` : `${movList.length} resultado(s)`}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-gray-50">← Anterior</Link>
            )}
            {movList.length === limit && (
              <Link href={pageUrl(page + 1)} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-gray-50">Siguiente →</Link>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
