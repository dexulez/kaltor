'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export type VendedorRow = {
  id: string
  codigo: string
  nombre: string
  email: string
  telefono: string | null
  estado: string
  created_at: string
  clientes: number
  comision_pendiente: number
  comision_pagada: number
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-700' },
  activo:     { label: 'Activo',     cls: 'bg-green-100 text-green-700' },
  rechazado:  { label: 'Rechazado',  cls: 'bg-red-100 text-red-700' },
  suspendido: { label: 'Suspendido', cls: 'bg-orange-100 text-orange-700' },
}

const FILTER_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'activo', label: 'Activos' },
  { key: 'rechazado', label: 'Rechazados' },
  { key: 'suspendido', label: 'Suspendidos' },
]

export default function VendedoresTable({ vendedores }: { vendedores: VendedorRow[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')

  const filtered = useMemo(() => vendedores.filter(v => {
    const q = search.toLowerCase()
    const matchSearch = !q || v.nombre.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.codigo.toLowerCase().includes(q)
    const matchStatus = filter === 'todos' || v.estado === filter
    return matchSearch && matchStatus
  }), [vendedores, search, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: vendedores.length }
    vendedores.forEach(v => { c[v.estado] = (c[v.estado] ?? 0) + 1 })
    return c
  }, [vendedores])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text"
          placeholder="Buscar nombre, email o código..."
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Clientes</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Comisión pendiente</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {search || filter !== 'todos' ? 'Sin resultados para esa búsqueda' : 'No hay vendedores registrados'}
                </td>
              </tr>
            ) : filtered.map(v => {
              const cfg = STATUS_CFG[v.estado] ?? STATUS_CFG.pendiente
              return (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{v.nombre}</p>
                    <p className="text-xs text-gray-400">{v.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{v.codigo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-xs font-bold text-gray-700">
                      {v.clientes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    {v.comision_pendiente > 0 ? `$${v.comision_pendiente.toLocaleString('es-CL')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/kaltor-admin/vendedores/${v.id}`}
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
        {filtered.length} de {vendedores.length} vendedor{vendedores.length !== 1 ? 'es' : ''}
      </div>
    </div>
  )
}
