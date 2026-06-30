import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo } from '@/lib/modulos'
import Link from 'next/link'
import { Suspense } from 'react'
import BuscadorPedidosB2B from '@/components/pedidos-b2b/BuscadorPedidosB2B'
import ListaPedidosCompradorPago from '@/components/pedidos-b2b/ListaPedidosCompradorPago'

type RolesRel = { nombre?: string } | { nombre?: string }[] | null | undefined

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', preparando: 'Preparando', en_camino: 'En camino',
  entregado: 'Entregado', rechazado: 'Rechazado', cancelado: 'Cancelado',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-green-100 text-green-700',
  preparando: 'bg-blue-100 text-blue-700',
  en_camino: 'bg-indigo-100 text-indigo-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
}
const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito',
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

const PASOS_MINI = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado'] as const

// Mini barra de seguimiento (puntos) para la lista de pedidos — versión compacta de la de /pedidos-b2b/[id]
function MiniSeguimientoB2B({ estado }: { estado: string }) {
  const detenido = estado === 'rechazado' || estado === 'cancelado'
  const idxActual = PASOS_MINI.indexOf(estado as typeof PASOS_MINI[number])
  const completados = new Set(detenido ? PASOS_MINI.slice(0, 1) : PASOS_MINI.slice(0, Math.max(idxActual, 0)))
  const activoId = detenido ? '' : PASOS_MINI[idxActual]

  return (
    <div className="flex items-center justify-end gap-0.5">
      {PASOS_MINI.map((paso, idx) => {
        const done = completados.has(paso)
        const current = !detenido && activoId === paso
        const fallido = detenido && idx === 1
        const isLast = idx === PASOS_MINI.length - 1
        return (
          <div key={paso} className="flex items-center">
            <span className={`block w-1.5 h-1.5 rounded-full ${
              fallido ? 'bg-red-500' : done ? 'bg-green-500' : current ? 'bg-blue-500 animate-pulse' : 'bg-gray-200'
            }`} />
            {!isLast && <span className={`block w-2.5 h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

interface PedidoRow {
  id: string; numero_pedido: string; estado: string; total_estimado: number
  comprador_id: string; created_at: string
  metodo_pago: string | null; pagado: boolean; fecha_entregado: string | null
  monto_pagado: number | null; fecha_vencimiento_pago: string | null
  confirmado_por: string | null; rechazado_por: string | null; cancelado_por: string | null
  motivo_rechazo: string | null; motivo_cancelacion: string | null
  pago_en_revision: boolean
}

export default async function PedidosB2BPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { q, estado: estadoFiltro } = await searchParams
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

  let query = supabase.from('sales_orders').select('id, numero_pedido, estado, total_estimado, comprador_id, created_at, metodo_pago, pagado, fecha_entregado, monto_pagado, fecha_vencimiento_pago, confirmado_por, rechazado_por, cancelado_por, motivo_rechazo, motivo_cancelacion, pago_en_revision').order('created_at', { ascending: false })
  if (esComprador) query = query.eq('comprador_id', user!.id)

  const { data: pedidos, error: pedidosError } = await query
  if (pedidosError) console.error('[pedidos-b2b] error al cargar sales_orders:', pedidosError)
  const todaLaLista = (pedidos ?? []) as PedidoRow[]

  // Lookup de compradores por separado (evita ambigüedad de FK con confirmado_por)
  let datosComprador: Record<string, { nombre: string; customerId: string | null }> = {}
  if (!esComprador && todaLaLista.length > 0) {
    const ids = [...new Set(todaLaLista.map(p => p.comprador_id))]
    const { data: compradores } = await supabase.from('user_profiles').select('id, nombre_completo, customer_id').in('id', ids)
    datosComprador = Object.fromEntries((compradores ?? []).map(c => [c.id, { nombre: c.nombre_completo as string, customerId: c.customer_id as string | null }]))
  }

  // Lookup de quién confirmó/rechazó/canceló (mismo motivo: evita ambigüedad de FK)
  const actorIds = [...new Set(todaLaLista.flatMap(p => [p.confirmado_por, p.rechazado_por, p.cancelado_por]).filter((x): x is string => !!x))]
  let nombresActores: Record<string, string> = {}
  if (actorIds.length > 0) {
    const { data: actores } = await supabase.from('user_profiles').select('id, nombre_completo').in('id', actorIds)
    nombresActores = Object.fromEntries((actores ?? []).map(a => [a.id, a.nombre_completo as string]))
  }

  const qNorm = (q ?? '').trim().toLowerCase()
  const lista = todaLaLista.filter(p => {
    if (estadoFiltro && p.estado !== estadoFiltro) return false
    if (qNorm) {
      const enNumero = p.numero_pedido.toLowerCase().includes(qNorm)
      const enComprador = (datosComprador[p.comprador_id]?.nombre ?? '').toLowerCase().includes(qNorm)
      if (!enNumero && !enComprador) return false
    }
    return true
  })

  const grupos: { estado: string; titulo: string }[] = [
    { estado: 'pendiente', titulo: esComprador ? 'Pendientes de revisión' : 'Pendientes de confirmar' },
    { estado: 'confirmado', titulo: 'Confirmados' },
    { estado: 'preparando', titulo: 'Preparando' },
    { estado: 'en_camino', titulo: 'En camino' },
    { estado: 'entregado', titulo: 'Entregados' },
    { estado: 'rechazado', titulo: 'Rechazados' },
    { estado: 'cancelado', titulo: 'Cancelados' },
  ]

  const hoy = new Date().toISOString().split('T')[0]
  const pedidosVencidos = !esComprador
    ? todaLaLista.filter(p => !p.pagado && p.fecha_vencimiento_pago && p.fecha_vencimiento_pago < hoy && ['confirmado', 'preparando', 'en_camino'].includes(p.estado))
    : []

  const estadisticasComprador = esComprador ? {
    totalComprado: todaLaLista.filter(p => !['rechazado', 'cancelado', 'pendiente'].includes(p.estado)).reduce((s, p) => s + p.total_estimado, 0),
    pedidosEntregados: todaLaLista.filter(p => p.estado === 'entregado').length,
    pendientePago: todaLaLista
      .filter(p => ['confirmado', 'preparando', 'en_camino', 'entregado'].includes(p.estado) && !p.pagado && !p.pago_en_revision)
      .reduce((s, p) => s + (p.total_estimado - (p.monto_pagado ?? 0)), 0),
    enRevision: todaLaLista.filter(p => p.pago_en_revision).length,
  } : null

  const filtroHref = (valor?: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (valor) params.set('estado', valor)
    const qs = params.toString()
    return qs ? `/pedidos-b2b?${qs}` : '/pedidos-b2b'
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📥</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{esComprador ? 'Mis pedidos' : 'Pedidos de clientes (B2B)'}</h1>
            <p className="text-sm text-gray-500">{todaLaLista.length} pedido(s)</p>
          </div>
        </div>
        {esComprador && (
          <Link href="/catalogo-b2b" className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors">
            🛍️ Ir al catálogo
          </Link>
        )}
      </div>

      {estadisticasComprador && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Total comprado</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCLP(estadisticasComprador.totalComprado)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Pedidos entregados</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{estadisticasComprador.pedidosEntregados}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Pendiente de pago</p>
            <p className="text-lg font-bold text-amber-600 mt-0.5">{formatCLP(estadisticasComprador.pendientePago)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Pagos en revisión</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{estadisticasComprador.enRevision}</p>
          </div>
        </div>
      )}

      {pedidosVencidos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-red-200 flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <p className="font-semibold text-red-800 text-sm">
              {pedidosVencidos.length} pago{pedidosVencidos.length > 1 ? 's' : ''} vencido{pedidosVencidos.length > 1 ? 's' : ''} — requieren atención
            </p>
          </div>
          <div className="divide-y divide-red-100">
            {pedidosVencidos.map(p => {
              const comprador = datosComprador[p.comprador_id]
              const saldo = (p.total_estimado ?? 0) - (p.monto_pagado ?? 0)
              const diasVencido = Math.floor((new Date(hoy).getTime() - new Date(p.fecha_vencimiento_pago!).getTime()) / 86400000)
              return (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <Link href={`/pedidos-b2b/${p.id}`} className="font-mono font-semibold text-red-700 hover:underline">{p.numero_pedido}</Link>
                      <span className="text-xs text-red-500">{diasVencido} día{diasVencido !== 1 ? 's' : ''} vencido</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{comprador?.nombre ?? '—'} · Saldo: <strong>{formatCLP(saldo)}</strong></p>
                  </div>
                  <Link href={`/pedidos-b2b/${p.id}`} className="text-xs text-red-700 hover:underline font-medium shrink-0">
                    Ver pedido →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Suspense fallback={<input placeholder="Buscar..." className="border rounded-lg px-3 py-2 text-sm w-64" />}>
          <BuscadorPedidosB2B defaultValue={q} />
        </Suspense>
        <Link href={filtroHref()}>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border ${!estadoFiltro ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            Todos
          </span>
        </Link>
        {grupos.map(g => (
          <Link key={g.estado} href={filtroHref(g.estado)}>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors
              ${estadoFiltro === g.estado ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
              {ESTADO_LABEL[g.estado]}
            </span>
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <span className="text-4xl block mb-2">📭</span>
          <p className="text-sm">
            {todaLaLista.length === 0
              ? (esComprador ? 'Todavía no has hecho ningún pedido' : 'Sin pedidos de compradores externos todavía')
              : 'Sin resultados para tu búsqueda/filtro'}
          </p>
        </div>
      ) : esComprador ? (
        <ListaPedidosCompradorPago lista={lista} grupos={grupos} />
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
                      <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Monto</th>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Fecha entregado</th>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Medio de pago</th>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Pagado</th>
                      <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map(p => {
                      const comprador = datosComprador[p.comprador_id]
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <Link href={`/pedidos-b2b/${p.id}`} className="font-mono font-medium text-blue-700 hover:underline">
                              {p.numero_pedido}
                            </Link>
                          </td>
                          {!esComprador && (
                            <td className="px-4 py-2.5">
                              {comprador?.customerId ? (
                                <Link href={`/clientes/${comprador.customerId}`} className="text-blue-600 hover:underline">
                                  {comprador.nombre}
                                </Link>
                              ) : (
                                comprador?.nombre ?? '—'
                              )}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-gray-500">{p.created_at.split('T')[0]}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{formatCLP(p.total_estimado)}</td>
                          <td className="px-4 py-2.5 text-gray-500">{p.fecha_entregado ? p.fecha_entregado.split('T')[0] : '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{p.metodo_pago ? (METODO_PAGO_LABEL[p.metodo_pago] ?? p.metodo_pago) : '—'}</td>
                          <td className="px-4 py-2.5">
                            {['confirmado', 'preparando', 'en_camino', 'entregado'].includes(p.estado) ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.pagado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {p.pagado ? '✓ Pagado' : 'Pendiente'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link href={`/pedidos-b2b/${p.id}`} className="inline-flex flex-col items-end gap-1 group cursor-pointer">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium group-hover:opacity-80 transition-opacity ${ESTADO_COLOR[p.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                                {ESTADO_LABEL[p.estado] ?? p.estado}
                              </span>
                              <MiniSeguimientoB2B estado={p.estado} />
                              {['confirmado', 'preparando', 'en_camino', 'entregado'].includes(p.estado) && p.confirmado_por && (
                                <p className="text-[10px] text-gray-400 max-w-[180px] ml-auto">
                                  Por {nombresActores[p.confirmado_por] ?? 'Vendedor'} (TechRepair Pro)
                                </p>
                              )}
                              {p.estado === 'rechazado' && (
                                <p className="text-[10px] text-gray-400 max-w-[180px] ml-auto">
                                  Por {p.rechazado_por ? (nombresActores[p.rechazado_por] ?? 'Vendedor') : 'Vendedor'} (TechRepair Pro)
                                  {p.motivo_rechazo && <>: {p.motivo_rechazo}</>}
                                </p>
                              )}
                              {p.estado === 'cancelado' && (
                                <p className="text-[10px] text-gray-400 max-w-[180px] ml-auto">
                                  Por {p.cancelado_por ? (nombresActores[p.cancelado_por] ?? 'Vendedor') : 'Vendedor'} (TechRepair Pro)
                                  {p.motivo_cancelacion && <>: {p.motivo_cancelacion}</>}
                                </p>
                              )}
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
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
