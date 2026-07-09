import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AjusteStockForm from '@/components/inventario/AjusteStockForm'

export default async function AjusteStockPage() {
  const supabase = await createClient()

  const [{ data: productos }, { data: ajustes }] = await Promise.all([
    supabase.from('products')
      .select('id, nombre, sku, stock_actual, precio_costo, unidad_medida')
      .eq('activo', true)
      .order('nombre'),
    supabase.from('stock_movements')
      .select('id, tipo, cantidad, stock_anterior, stock_nuevo, razon, nombre_usuario, created_at, products(nombre, sku)')
      .in('tipo', ['ajuste_positivo', 'ajuste_negativo', 'ajuste'])
      .order('created_at', { ascending: false })
      .limit(50)
      .then(r => r.error ? { data: [] } : r),
  ])

  type AjusteRow = {
    id: string; tipo: string; cantidad: number; stock_anterior: number; stock_nuevo: number
    razon: string | null; nombre_usuario: string | null; created_at: string
    products: { nombre: string; sku: string | null } | { nombre: string; sku: string | null }[] | null
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/inventario" className="text-sm text-blue-600 hover:underline">← Inventario</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">📦 Ajuste de stock</h1>
        <p className="text-sm text-gray-500">Carga o descarga productos por merma, corrección, uso interno u otro motivo</p>
      </div>

      <AjusteStockForm productos={(productos ?? []) as { id: string; nombre: string; sku: string | null; stock_actual: number; precio_costo: number; unidad_medida: string }[]} />

      {/* Historial de ajustes recientes */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Últimos ajustes registrados</h2>
          <Link href="/inventario/movimientos?tipo=ajuste_positivo" className="text-xs text-blue-600 hover:underline">
            Ver todos →
          </Link>
        </div>
        {(ajustes as AjusteRow[]).length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin ajustes registrados aún</p>
        ) : (
          <div className="divide-y overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Fecha', 'Producto', 'Tipo', 'Cant.', 'Antes', 'Después', 'Motivo', 'Usuario'].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(ajustes as AjusteRow[]).map(a => {
                  const prod = Array.isArray(a.products) ? a.products[0] : a.products
                  const esCarga = a.tipo === 'ajuste_positivo'
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800 text-sm">{prod?.nombre ?? '—'}</p>
                        {prod?.sku && <p className="text-xs text-gray-400">{prod.sku}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${esCarga ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {esCarga ? '📥 Carga' : '📤 Descarga'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-sm">
                        <span className={esCarga ? 'text-green-700' : 'text-red-700'}>
                          {esCarga ? '+' : '−'}{a.cantidad}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-gray-500 font-mono">{a.stock_anterior}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-sm font-mono">{a.stock_nuevo}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[180px]">
                        <p className="truncate">{a.razon ?? '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {a.nombre_usuario ?? <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
