'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ReportarPagoB2BForm from './ReportarPagoB2BForm'

interface PedidoRow {
  id: string
  numero_pedido: string
  estado: string
  total_estimado: number
  created_at: string
  metodo_pago: string | null
  pagado: boolean
  pago_en_revision: boolean
  monto_pagado: number | null
  fecha_entregado: string | null
}

interface Grupo {
  estado: string
  titulo: string
}

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
const ESTADOS_PAGABLES = ['confirmado', 'preparando', 'en_camino', 'entregado']
const PASOS_MINI = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado'] as const

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

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

export default function ListaPedidosCompradorPago({ lista, grupos }: { lista: PedidoRow[]; grupos: Grupo[] }) {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())

  const esPagable = (p: PedidoRow) => ESTADOS_PAGABLES.includes(p.estado) && !p.pagado && !p.pago_en_revision

  function toggle(id: string) {
    setSeleccion(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seleccionados = useMemo(() => lista.filter(p => seleccion.has(p.id)), [lista, seleccion])
  const totalSeleccionado = seleccionados.reduce((s, p) => s + (p.total_estimado - (p.monto_pagado ?? 0)), 0)

  return (
    <div className="space-y-5 pb-4">
      {grupos.map(g => {
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
                    <th className="w-8 px-4 py-2.5"></th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Pedido</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Fecha</th>
                    <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Monto</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Fecha entregado</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Medio de pago</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Pagado</th>
                    <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        {esPagable(p) && (
                          <input
                            type="checkbox"
                            checked={seleccion.has(p.id)}
                            onChange={() => toggle(p.id)}
                            className="w-4 h-4 accent-orange-500 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/pedidos-b2b/${p.id}`} className="font-mono font-medium text-blue-700 hover:underline">
                          {p.numero_pedido}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{p.created_at.split('T')[0]}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCLP(p.total_estimado)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.fecha_entregado ? p.fecha_entregado.split('T')[0] : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.metodo_pago ? (METODO_PAGO_LABEL[p.metodo_pago] ?? p.metodo_pago) : '—'}</td>
                      <td className="px-4 py-2.5">
                        {ESTADOS_PAGABLES.includes(p.estado) ? (
                          p.pago_en_revision ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">⏳ En revisión</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.pagado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {p.pagado ? '✓ Pagado' : 'Pendiente'}
                            </span>
                          )
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/pedidos-b2b/${p.id}`} className="inline-flex flex-col items-end gap-1 group cursor-pointer">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium group-hover:opacity-80 transition-opacity ${ESTADO_COLOR[p.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ESTADO_LABEL[p.estado] ?? p.estado}
                          </span>
                          <MiniSeguimientoB2B estado={p.estado} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {seleccion.size > 0 && (
        <div className="sticky bottom-4 bg-white border-2 border-orange-300 rounded-xl shadow-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm">
            <p className="font-semibold text-gray-800">{seleccion.size} pedido{seleccion.size > 1 ? 's' : ''} seleccionado{seleccion.size > 1 ? 's' : ''}</p>
            <p className="text-gray-500">Total a pagar: <strong className="text-orange-700">{formatCLP(totalSeleccionado)}</strong></p>
          </div>
          <ReportarPagoB2BForm
            pedidoIds={Array.from(seleccion)}
            totalAPagar={totalSeleccionado}
            etiqueta="Pagar seleccionados"
            onSuccess={() => setSeleccion(new Set())}
          />
        </div>
      )}
    </div>
  )
}
