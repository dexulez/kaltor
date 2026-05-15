import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const TZ = 'America/Santiago'

const TIPO_INFO: Record<string, { label: string; color: string; icono: string }> = {
  entrada:          { label: 'Recepción OC',      color: 'bg-green-100 text-green-800',   icono: '📦' },
  salida:           { label: 'Venta',              color: 'bg-red-100 text-red-800',       icono: '🛒' },
  ajuste_positivo:  { label: 'Ajuste (+)',         color: 'bg-blue-100 text-blue-800',     icono: '➕' },
  ajuste_negativo:  { label: 'Ajuste (−)',         color: 'bg-orange-100 text-orange-800', icono: '➖' },
  carga_inicial:    { label: 'Carga inicial',      color: 'bg-purple-100 text-purple-800', icono: '📥' },
  ajuste:           { label: 'Ajuste',             color: 'bg-yellow-100 text-yellow-800', icono: '✏️' },
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; tipo?: string; q?: string; page?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const hace30 = new Date()
  hace30.setDate(hace30.getDate() - 30)
  const hace30Str = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(hace30)

  const desde  = params.desde ?? hace30Str
  const hasta  = params.hasta ?? hoy
  const tipo   = params.tipo ?? ''
  const q      = params.q ?? ''
  const page   = parseInt(params.page ?? '1')
  const limit  = 100
  const offset = (page - 1) * limit

  // Query principal de movimientos
  let query = supabase
    .from('stock_movements')
    .select(`
      id, tipo, cantidad, stock_anterior, stock_nuevo, razon,
      referencia_id, referencia_tipo, usuario_id, nombre_usuario, created_at,
      products(id, nombre, sku, codigo_barras)
    `)
    .gte('created_at', `${desde}T00:00:00`)
    .lte('created_at', `${hasta}T23:59:59`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tipo) query = query.eq('tipo', tipo)

  const { data: movimientos, error } = await query

  // Si hay error por columnas faltantes, reintenta sin las nuevas columnas
  let lista = movimientos ?? []
  if (error) {
    const { data: fallback } = await supabase
      .from('stock_movements')
      .select(`
        id, tipo, cantidad, stock_anterior, stock_nuevo, razon,
        referencia_id, referencia_tipo, created_at,
        products(id, nombre, sku)
      `)
      .gte('created_at', `${desde}T00:00:00`)
      .lte('created_at', `${hasta}T23:59:59`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    lista = (fallback ?? []).map(m => ({ ...m, usuario_id: null, nombre_usuario: null, products: (m.products ?? []).map((p: { id: unknown; nombre: unknown; sku: unknown }) => ({ ...p, codigo_barras: null })) }))
  }

  // Filtrar por nombre de producto si hay búsqueda
  type Movimiento = {
    id: string; tipo: string; cantidad: number; stock_anterior: number; stock_nuevo: number
    razon: string | null; referencia_id: string | null; referencia_tipo: string | null
    usuario_id?: string | null; nombre_usuario?: string | null; created_at: string
    products: { id: string; nombre: string; sku?: string | null; codigo_barras?: string | null } | { id: string; nombre: string; sku?: string | null; codigo_barras?: string | null }[] | null
  }

  let movList = lista as Movimiento[]
  if (q.trim()) {
    const term = q.toLowerCase()
    movList = movList.filter(m => {
      const prod = Array.isArray(m.products) ? m.products[0] : m.products
      return prod?.nombre?.toLowerCase().includes(term) ||
        prod?.sku?.toLowerCase().includes(term) ||
        m.razon?.toLowerCase().includes(term) ||
        m.nombre_usuario?.toLowerCase().includes(term)
    })
  }

  // Estadísticas rápidas
  const totalEntradas = movList.filter(m => m.tipo === 'entrada' || m.tipo === 'carga_inicial' || m.tipo === 'ajuste_positivo')
    .reduce((s, m) => s + m.cantidad, 0)
  const totalSalidas = movList.filter(m => m.tipo === 'salida' || m.tipo === 'ajuste_negativo')
    .reduce((s, m) => s + m.cantidad, 0)
  const totalAjustes = movList.filter(m => m.tipo === 'ajuste').length

  // Construir URL con filtros actuales
  function buildUrl(updates: Record<string, string>) {
    const p = new URLSearchParams({ desde, hasta, ...(tipo && { tipo }), ...(q && { q }) })
    Object.entries(updates).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `/inventario/movimientos?${p.toString()}`
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/inventario" className="text-sm text-blue-600 hover:underline">← Inventario</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">📋 Movimientos de inventario</h1>
          <p className="text-sm text-gray-500">Trazabilidad completa de cada cambio de stock — quién, cuándo, por qué</p>
        </div>
        <Link href="/compras/historial">
          <button className="text-sm text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-xl font-medium">
            🛒 Historial de compras →
          </button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Desde</label>
            <input type="date" value={desde} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              onChange={() => {}} readOnly
              id="filtro-desde" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Hasta</label>
            <input type="date" value={hasta} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              onChange={() => {}} readOnly
              id="filtro-hasta" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Tipo</label>
            <select value={tipo} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              onChange={() => {}} id="filtro-tipo">
              <option value="">Todos</option>
              {Object.entries(TIPO_INFO).map(([k, v]) => (
                <option key={k} value={k}>{v.icono} {v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-40 space-y-1">
            <label className="text-xs text-gray-500 font-medium">Buscar producto / usuario</label>
            <input type="text" value={q} placeholder="Nombre, SKU, usuario..." readOnly
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              id="filtro-q" />
          </div>
        </div>
        <FiltrosClient desde={desde} hasta={hasta} tipo={tipo} q={q} />
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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
          <p className="text-xs text-yellow-700">Ajustes</p>
          <p className="text-2xl font-bold text-yellow-700">{totalAjustes}</p>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha / Hora', 'Tipo', 'Producto', 'Cant.', 'Stock ant.', 'Stock nuevo', 'Razón / Origen', 'Usuario'].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {movList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Sin movimientos en el período seleccionado
                  </td>
                </tr>
              ) : movList.map(m => {
                const prod = Array.isArray(m.products) ? m.products[0] : m.products
                const info = TIPO_INFO[m.tipo] ?? { label: m.tipo, color: 'bg-gray-100 text-gray-700', icono: '📋' }
                const esEntrada = ['entrada', 'carga_inicial', 'ajuste_positivo'].includes(m.tipo)
                const esSalida  = ['salida', 'ajuste_negativo'].includes(m.tipo)
                const fechaHora = new Date(m.created_at).toLocaleString('es-CL', {
                  timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })
                const docLink = m.referencia_tipo === 'purchase_order' && m.referencia_id
                  ? `/compras/orden/${m.referencia_id}`
                  : null

                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">{fechaHora}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                        {info.icono} {info.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {prod ? (
                        <div>
                          <Link href={`/inventario/${prod.id}/editar`} className="font-medium text-gray-900 hover:text-blue-700 hover:underline text-sm">
                            {prod.nombre}
                          </Link>
                          {prod.sku && <p className="text-xs text-gray-400">{prod.sku}</p>}
                        </div>
                      ) : <span className="text-gray-400 text-xs">Producto eliminado</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold text-sm ${esEntrada ? 'text-green-700' : esSalida ? 'text-red-700' : 'text-yellow-700'}`}>
                        {esEntrada ? '+' : esSalida ? '−' : '±'}{m.cantidad}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-gray-500 font-mono">{m.stock_anterior}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-bold text-sm font-mono ${esEntrada ? 'text-green-700' : esSalida ? 'text-red-700' : 'text-gray-700'}`}>
                        {m.stock_nuevo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[200px]">
                      <p className="truncate">{m.razon ?? '—'}</p>
                      {docLink && (
                        <Link href={docLink} className="text-blue-600 hover:underline text-xs">
                          Ver OC →
                        </Link>
                      )}
                      {m.referencia_tipo === 'carga_masiva' && (
                        <p className="text-purple-600 text-xs">CSV import</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">
                      {m.nombre_usuario ?? (m.usuario_id ? `ID:${m.usuario_id.slice(0, 6)}` : <span className="text-gray-300">—</span>)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {movList.length === limit && (
          <div className="border-t px-4 py-3 flex justify-between items-center bg-gray-50">
            <span className="text-xs text-gray-500">Mostrando {limit} por página</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-white transition-colors">← Anterior</Link>
              )}
              <Link href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-white transition-colors">Siguiente →</Link>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TIPO_INFO).map(([k, v]) => (
          <Link key={k} href={buildUrl({ tipo: tipo === k ? '' : k, page: '1' })}>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border ${tipo === k ? 'ring-2 ring-offset-1 ring-blue-400' : ''} ${v.color}`}>
              {v.icono} {v.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// Componente cliente solo para manejar los inputs de filtro
function FiltrosClient({ desde, hasta }: { desde: string; hasta: string; tipo: string; q: string }) {
  return (
    <script dangerouslySetInnerHTML={{
      __html: `
        (function() {
          const base = '/inventario/movimientos';
          function nav() {
            const d = document.getElementById('filtro-desde')?.value || '${desde}';
            const h = document.getElementById('filtro-hasta')?.value || '${hasta}';
            const t = document.getElementById('filtro-tipo')?.value || '';
            const qq = document.getElementById('filtro-q')?.value || '';
            const p = new URLSearchParams({ desde: d, hasta: h });
            if (t) p.set('tipo', t);
            if (qq) p.set('q', qq);
            window.location = base + '?' + p.toString();
          }
          ['filtro-desde','filtro-hasta','filtro-tipo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.removeAttribute('readonly');
              el.addEventListener('change', nav);
            }
          });
          const qEl = document.getElementById('filtro-q');
          if (qEl) {
            qEl.removeAttribute('readonly');
            let timer;
            qEl.addEventListener('input', function() {
              clearTimeout(timer);
              timer = setTimeout(nav, 600);
            });
          }
        })();
      `
    }} />
  )
}
