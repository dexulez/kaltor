'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

export type StoreRow = {
  id: string
  nombre: string
  email: string
  activo: boolean
  created_at: string
  trial_hasta: string | null
  billing_status: string | null
  flow_subscription_id: string | null
  proximo_cobro_at?: string | null
  plans: { nombre: string; precio_mes: number } | null
  user_profiles: { count: number }[]
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  trial:     { label: 'En trial',      cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activa',        cls: 'bg-green-100 text-green-700' },
  pending:   { label: 'Pendiente',     cls: 'bg-yellow-100 text-yellow-700' },
  past_due:  { label: 'Pago vencido',  cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada',     cls: 'bg-gray-100 text-gray-500' },
  suspended: { label: 'Suspendida',    cls: 'bg-orange-100 text-orange-700' },
  vencido:   { label: 'Trial vencido', cls: 'bg-red-100 text-red-700' },
}

const FILTER_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'trial', label: 'En trial' },
  { key: 'active', label: 'Activas' },
  { key: 'vencido', label: 'Trial vencido' },
  { key: 'past_due', label: 'Pago vencido' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'suspended', label: 'Suspendidas' },
]

function getStatus(s: StoreRow): string {
  const st = s.billing_status ?? 'trial'
  if (st === 'trial' && s.trial_hasta && new Date(s.trial_hasta) <= new Date()) return 'vencido'
  return st
}

function diasRestantes(fecha: string | null): number {
  if (!fecha) return 0
  return Math.max(0, Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000))
}

export default function StoresTable({ stores }: { stores: StoreRow[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')

  const filtered = useMemo(() => stores.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    const matchStatus = filter === 'todos' || getStatus(s) === filter
    return matchSearch && matchStatus
  }), [stores, search, filter])

  // Counts for filter tabs
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: stores.length }
    stores.forEach(s => { const st = getStatus(s); c[st] = (c[st] ?? 0) + 1 })
    return c
  }, [stores])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Controls */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text"
          placeholder="Buscar empresa o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
        />
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-[#FF7A1A] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {counts[tab.key] !== undefined && (
                <span className={`ml-1 text-[10px] ${filter === tab.key ? 'text-white/70' : 'text-gray-400'}`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trial / Próx. cobro</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuarios</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {search || filter !== 'todos' ? 'Sin resultados para esa búsqueda' : 'No hay empresas registradas'}
                </td>
              </tr>
            ) : filtered.map(store => {
              const status = getStatus(store)
              const cfg = STATUS_CFG[status] ?? STATUS_CFG.trial
              const userCount = store.user_profiles?.[0]?.count ?? 0
              const diasTrial = status === 'trial' ? diasRestantes(store.trial_hasta) : null

              return (
                <tr key={store.id} className={`hover:bg-gray-50 transition-colors ${!store.activo ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{store.nombre}</p>
                    <p className="text-xs text-gray-400">{store.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">{store.plans?.nombre ?? '—'}</p>
                    {store.plans?.precio_mes ? (
                      <p className="text-xs text-gray-400">${store.plans.precio_mes.toLocaleString('es-CL')}/mes</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    {!store.activo && (
                      <span className="ml-1 text-xs text-red-500 font-medium">· Suspendida</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {diasTrial !== null ? (
                      <span className={`text-sm font-semibold ${
                        diasTrial === 0 ? 'text-red-600' :
                        diasTrial <= 3 ? 'text-orange-500' :
                        diasTrial <= 7 ? 'text-yellow-600' :
                        'text-gray-700'
                      }`}>
                        {diasTrial === 0 ? 'Vencido' : `${diasTrial} días`}
                      </span>
                    ) : status === 'active' && store.proximo_cobro_at ? (
                      <span className="text-sm text-gray-700">
                        {new Date(store.proximo_cobro_at).toLocaleDateString('es-CL')}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-xs font-bold text-gray-700">
                      {userCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(store.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/kaltor-admin/tiendas/${store.id}`}
                      className="text-xs font-semibold text-[#FF7A1A] hover:text-[#E06010] hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
        {filtered.length} de {stores.length} empresa{stores.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
