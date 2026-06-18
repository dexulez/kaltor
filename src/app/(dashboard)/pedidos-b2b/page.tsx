import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo } from '@/lib/modulos'
import Link from 'next/link'

type RolesRel = { nombre?: string } | { nombre?: string }[] | null | undefined

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', rechazado: 'Rechazado', cancelado: 'Cancelado',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

interface PedidoRow {
  id: string; numero_pedido: string; estado: string; total_estimado: number
  comprador_id: string; created_at: string
}

export default async function PedidosB2BPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()

  const rolesRel = profile?.roles as RolesRel
  const rol = (Array.isArray(rolesRel) ? rolesRel[0]?.nombre : rolesRel?.nombre) ?? ''
  const permisos = profile?.permisos_modulos as Record<string, boolean> | null

  if (!tieneAccesoModulo('pedidos_b2b', rol, permisos)) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          No tienes acceso a Pedidos B2B.
        </div>
      </div>
    )
  }

  const esComprador = rol === 'comprador_externo'

  let query = supabase.from('sales_orders').select('id, numero_pedido, estado, total_estimado, comprador_id, created_at').order('created_at', { ascending: false })
  if (esComprador) query = query.eq('comprador_id', user!.id)

  const { data: pedidos } = await query
  const lista = (pedidos ?? []) as PedidoRow[]

  // Lookup de compradores por separado (evita ambigüedad de FK con confirmado_por)
  let nombrePorComprador: Record<string, string> = {}
  if (!esComprador && lista.length > 0) {
    const ids = [...new Set(lista.map(p => p.comprador_id))]
    const { data: compradores } = await supabase.from('user_profiles').select('id, nombre_completo').in('id', ids)
    nombrePorComprador = Object.fromEntries((compradores ?? []).map(c => [c.id, c.nombre_completo as string]))
  }

  const grupos: { estado: string; titulo: string }[] = [
    { estado: 'pendiente', titulo: esComprador ? 'Pendientes de revisión' : 'Pendientes de confirmar' },
    { estado: 'confirmado', titulo: 'Confirmados' },
    { estado: 'rechazado', titulo: 'Rechazados' },
    { estado: 'cancelado', titulo: 'Cancelados' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📥</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{esComprador ? 'Mis pedidos' : 'Pedidos de clientes (B2B)'}</h1>
            <p className="text-sm text-gray-500">{lista.length} pedido(s)</p>
          </div>
        </div>
        {esComprador && (
          <Link href="/catalogo-b2b" className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors">
            🛍️ Ir al catálogo
          </Link>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <span className="text-4xl block mb-2">📭</span>
          <p className="text-sm">{esComprador ? 'Todavía no has hecho ningún pedido' : 'Sin pedidos de compradores externos todavía'}</p>
        </div>
      ) : (
        grupos.map(g => {
          const items = lista.filter(p => p.estado === g.estado)
          if (items.length === 0) return null
          return (
            <div key={g.estado} className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gray-50 border-b px-4 py-2.5">
                <h2 className="font-semibold text-gray-800 text-sm">{g.titulo} ({items.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Pedido</th>
                      {!esComprador && <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Comprador</th>}
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Fecha</th>
                      <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Total estimado</th>
                      <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Estado</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono font-medium text-blue-700">{p.numero_pedido}</td>
                        {!esComprador && <td className="px-4 py-2.5">{nombrePorComprador[p.comprador_id] ?? '—'}</td>}
                        <td className="px-4 py-2.5 text-gray-500">{p.created_at.split('T')[0]}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatCLP(p.total_estimado)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_COLOR[p.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ESTADO_LABEL[p.estado] ?? p.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/pedidos-b2b/${p.id}`} className="text-blue-600 hover:underline text-xs">Ver →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
