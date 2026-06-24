'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import ConfirmarBorradorBtn from '@/components/compras/ConfirmarBorradorBtn'

const ESTADOS_ENVIADO = ['en_transito', 'recibida_parcial', 'recibida_completa']

const OC_ESTADO: Record<string, { label: string; color: string }> = {
  pendiente:           { label: 'Pendiente',              color: 'bg-yellow-100 text-yellow-700' },
  enviada:             { label: 'Enviada al proveedor',   color: 'bg-green-100 text-green-700' },
  proveedor_respondio: { label: '⚡ Respondida',          color: 'bg-green-100 text-green-800' },
  confirmada:          { label: 'Confirmada',             color: 'bg-violet-100 text-violet-700' },
  preparando:          { label: 'Preparando pedido',    color: 'bg-fuchsia-100 text-fuchsia-700' },
  en_transito:         { label: 'En tránsito',            color: 'bg-blue-100 text-blue-700' },
  recibida_parcial:    { label: 'Rec. parcial',           color: 'bg-orange-100 text-orange-700' },
  recibida_completa:   { label: 'Recibida',               color: 'bg-emerald-100 text-emerald-700' },
  cancelada:           { label: 'Cancelada',              color: 'bg-gray-200 text-gray-500' },
}

interface Orden {
  id: string
  numero_oc: string
  estado: string
  metodo_pago?: string | null
  total?: number | null
  monto_pagado?: number | null
  fecha_pago?: string | null
  created_at?: string | null
  notas?: string | null
  suppliers?: { nombre?: string | null; whatsapp?: string | null; telefono?: string | null } | null
  fecha_estimada_llegada?: string | null
}

interface Props {
  borradores: Orden[]
  ordenes: Orden[]
  hoyStr: string
  puedeCrear?: boolean
}

const FILTROS_CONFIG = [
  {
    key: 'pendientes',
    label: 'Pendientes de enviar',
    icon: '⏳',
    estados: ['pendiente'],
    colorActivo: 'bg-yellow-400 text-white border-yellow-400',
    colorInactivo: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-400',
  },
  {
    key: 'enviadas',
    label: 'Enviadas al proveedor',
    icon: '📤',
    estados: ['enviada', 'proveedor_respondio'],
    colorActivo: 'bg-green-500 text-white border-green-500',
    colorInactivo: 'bg-green-50 text-green-700 border-green-200 hover:border-green-400',
  },
  {
    key: 'confirmada',
    label: 'Confirmadas',
    icon: '✅',
    estados: ['confirmada'],
    colorActivo: 'bg-violet-600 text-white border-violet-600',
    colorInactivo: 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400',
  },
  {
    key: 'preparando',
    label: 'Preparando pedido',
    icon: '📦',
    estados: ['preparando'],
    colorActivo: 'bg-fuchsia-600 text-white border-fuchsia-600',
    colorInactivo: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:border-fuchsia-400',
  },
  {
    key: 'transito',
    label: 'En tránsito',
    icon: '🚚',
    estados: ['en_transito'],
    colorActivo: 'bg-blue-500 text-white border-blue-500',
    colorInactivo: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
  },
  {
    key: 'parcial',
    label: 'Rec. parcial',
    icon: '📦',
    estados: ['recibida_parcial'],
    colorActivo: 'bg-orange-500 text-white border-orange-500',
    colorInactivo: 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400',
  },
]

export default function OrdenesConFiltro({ borradores, ordenes, hoyStr, puedeCrear = true }: Props) {
  const router = useRouter()
  const [filtrosActivos, setFiltrosActivos] = useState<string[]>([])

  function toggleFiltro(key: string) {
    setFiltrosActivos(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Calcular conteos
  const conteos: Record<string, number> = {}
  for (const f of FILTROS_CONFIG) {
    conteos[f.key] = ordenes.filter(o => f.estados.includes(o.estado ?? '')).length
  }
  // Sub-conteo: cuántas de las "enviadas" ya tienen respuesta del proveedor
  const conRespuesta = ordenes.filter(o => o.estado === 'proveedor_respondio').length
  const totalActivo = ordenes
    .filter(o => !['recibida_completa', 'cancelada'].includes(o.estado ?? ''))
    .reduce((s, o) => s + (o.total ?? 0), 0)

  // Filtrar tabla
  const estadosSeleccionados = filtrosActivos.flatMap(k => FILTROS_CONFIG.find(f => f.key === k)?.estados ?? [])
  const ordenesFiltradas = filtrosActivos.length === 0
    ? ordenes
    : ordenes.filter(o => estadosSeleccionados.includes(o.estado ?? ''))

  return (
    <div className="space-y-4">
      {/* KPI cards clickables */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {FILTROS_CONFIG.map(f => {
          const activo = filtrosActivos.includes(f.key)
          const count = conteos[f.key]
          return (
            <button
              key={f.key}
              onClick={() => toggleFiltro(f.key)}
              className={`relative rounded-xl border-2 px-4 py-3 text-left transition-all ${activo ? f.colorActivo : f.colorInactivo} ${count === 0 && !activo ? 'opacity-50' : ''}`}
            >
              <p className="text-xs uppercase tracking-wide font-medium opacity-80">{f.icon} {f.label}</p>
              <p className={`font-bold text-xl mt-1 ${activo ? 'text-white' : ''}`}>{count}</p>
              {f.key === 'enviadas' && conRespuesta > 0 && (
                <p className={`text-xs mt-0.5 font-medium ${activo ? 'text-white/80' : 'text-green-600'}`}>
                  ⚡ {conRespuesta} con respuesta
                </p>
              )}
              {activo && (
                <span className="absolute top-1.5 right-1.5 text-xs bg-white/30 rounded-full w-4 h-4 flex items-center justify-center font-bold">✓</span>
              )}
            </button>
          )
        })}
        {/* Total activo (no es filtro) */}
        <div className="bg-white rounded-xl border-2 border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">💰 Total activo</p>
          <p className="font-bold text-gray-800 text-lg mt-1">{formatCLP(totalActivo)}</p>
        </div>
      </div>

      {/* Indicador de filtros activos */}
      {filtrosActivos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Filtrando por:</span>
          {filtrosActivos.map(k => {
            const f = FILTROS_CONFIG.find(x => x.key === k)!
            return (
              <span key={k} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                {f.icon} {f.label}
                <button onClick={() => toggleFiltro(k)} className="ml-0.5 text-gray-400 hover:text-red-500">×</button>
              </span>
            )
          })}
          <button onClick={() => setFiltrosActivos([])} className="text-xs text-blue-600 hover:underline">
            Limpiar filtros
          </button>
        </div>
      )}

      {puedeCrear && (
        <div className="flex gap-2 justify-end">
          <Link href="/compras/orden/nueva-masiva">
            <Button variant="outline" className="gap-1.5">📊 Carga masiva desde Excel</Button>
          </Link>
          <Link href="/compras/orden/nueva">
            <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva orden de compra</Button>
          </Link>
        </div>
      )}

      {/* Solicitudes pendientes de enviar (borradores desde OTs) */}
      {borradores.length > 0 && filtrosActivos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
            <span className="text-lg">🛒</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-800">Solicitudes de repuestos pendientes de enviar</p>
              <p className="text-xs text-amber-600">Generadas desde órdenes de trabajo con stock insuficiente</p>
            </div>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">{borradores.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-amber-100/50 border-b border-amber-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-amber-700 text-xs">N° Solicitud</th>
                <th className="text-left px-4 py-2 font-medium text-amber-700 text-xs">Proveedor</th>
                <th className="text-right px-4 py-2 font-medium text-amber-700 text-xs">Total ref.</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {borradores.map(o => (
                <tr key={o.id} className="hover:bg-amber-100/40">
                  <td className="px-4 py-3 font-mono font-bold text-amber-700">{o.numero_oc}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{o.suppliers?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCLP(o.total ?? 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/compras/orden/${o.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">Ver items</Button>
                      </Link>
                      <ConfirmarBorradorBtn
                        ordenId={o.id}
                        numero={o.numero_oc}
                        supplierPhone={o.suppliers?.whatsapp ?? o.suppliers?.telefono}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla de órdenes */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {ordenesFiltradas.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <span className="text-5xl block mb-3">📋</span>
            <p className="font-medium">
              {filtrosActivos.length > 0 ? 'Sin órdenes para los filtros seleccionados' : 'Sin órdenes de compra'}
            </p>
            {filtrosActivos.length === 0 && (
              <Link href="/compras/orden/nueva" className="mt-2 text-sm text-blue-600 hover:underline block">
                Crear primera orden →
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['N° OC', 'Proveedor', 'Estado', 'Método pago', 'Fecha OC', 'Llegada est.', 'Total', 'Pago'].map((h, i) => (
                  <th key={i} className={`px-4 py-3 font-medium text-gray-600 ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ordenesFiltradas.map(o => {
                const est = OC_ESTADO[o.estado ?? '']
                // Fecha en zona horaria chilena para evitar desfase UTC
                const fechaCreacion = o.created_at
                  ? new Intl.DateTimeFormat('sv', { timeZone: 'America/Santiago' }).format(new Date(o.created_at))
                  : ''
                const diasDesde = fechaCreacion
                  ? Math.floor((new Date().getTime() - new Date(fechaCreacion + 'T12:00:00').getTime()) / 86400000)
                  : null
                const vencida = o.estado === 'en_transito' && o.fecha_estimada_llegada && o.fecha_estimada_llegada < hoyStr
                const esCredito = o.metodo_pago === 'credito'
                const montoPagadoOC = o.monto_pagado ?? 0
                const saldoPendienteOC = (o.total ?? 0) - montoPagadoOC
                return (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/compras/orden/${o.id}`)}
                    className={`hover:bg-gray-50 cursor-pointer ${vencida ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-700">
                        {o.numero_oc}
                      </span>
                      {vencida && <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Vencida</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.suppliers?.nombre ?? '—'}</p>
                      {o.suppliers?.whatsapp && (
                        <p className="text-xs text-gray-400">{o.suppliers.whatsapp}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${est?.color ?? 'bg-gray-100 text-gray-600'}`}>{est?.label ?? o.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${esCredito ? 'text-red-600' : 'text-gray-600'}`}>
                        {esCredito ? '💳 Crédito' : (o.metodo_pago ?? '—')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <p>{fechaCreacion || '—'}</p>
                      {diasDesde !== null && <p className="text-gray-400">{diasDesde}d atrás</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {o.fecha_estimada_llegada
                        ? <span className={vencida ? 'text-red-600 font-semibold' : ''}>{new Date(o.fecha_estimada_llegada + 'T12:00:00').toLocaleDateString('es-CL')}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCLP(o.total ?? 0)}</td>
                    <td className="px-4 py-3">
                      {o.estado === 'cancelada' || !ESTADOS_ENVIADO.includes(o.estado) ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : saldoPendienteOC <= 0 ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          ✓ Pagado{o.fecha_pago ? ` · ${new Date(o.fecha_pago).toLocaleDateString('es-CL')}` : ''}
                        </span>
                      ) : montoPagadoOC > 0 ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          🟡 Parcial
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          ⏳ Por pagar
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t bg-gray-50">
              <tr>
                <td colSpan={6} className="px-4 py-2.5 text-xs text-gray-500 font-medium">
                  {ordenesFiltradas.length} orden(es)
                  {filtrosActivos.length > 0 && ` (filtradas de ${ordenes.length})`}
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-gray-800">
                  {formatCLP(ordenesFiltradas.reduce((s, o) => s + (o.total ?? 0), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
