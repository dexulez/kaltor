'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'

const TZ = 'America/Santiago'

const ESTADO_INFO: Record<string, { label: string; color: string; icon: string }> = {
  pendiente:           { label: 'Pendiente',          color: 'bg-yellow-100 text-yellow-800', icon: '🕐' },
  enviada:             { label: 'Enviado a ti',        color: 'bg-purple-100 text-purple-800', icon: '📤' },
  proveedor_respondio: { label: 'Cotización enviada',  color: 'bg-teal-100 text-teal-800',    icon: '💬' },
  confirmada:          { label: 'Confirmado',          color: 'bg-indigo-100 text-indigo-800', icon: '✅' },
  preparando:          { label: 'Preparando pedido',  color: 'bg-violet-100 text-violet-800', icon: '📦' },
  en_transito:         { label: 'En camino',           color: 'bg-blue-100 text-blue-800',    icon: '🚚' },
  recibida_parcial:    { label: 'Recibido parcial',    color: 'bg-orange-100 text-orange-800', icon: '📦' },
  recibida_completa:   { label: 'Recibido completo',   color: 'bg-green-100 text-green-800',  icon: '✅' },
  cancelada:           { label: 'Cancelado',           color: 'bg-red-100 text-red-800',      icon: '❌' },
}

type HistorialItem = {
  id: string; nombre: string; cantidad_solicitada: number; cantidad_recibida?: number
  precio_unitario: number; precio_aceptado?: number | null; precio_cotizado?: number | null
  disponible_proveedor?: boolean | null
}

export type HistorialOC = {
  id: string; numero_oc: string; estado: string; total: number; created_at: string
  fecha_recepcion: string | null; costo_envio_total: number
  comprobante_pago_urls?: string[] | null
  monto_pagado: number
  purchase_order_items?: HistorialItem[]
}

interface Props {
  historial: HistorialOC[]
  currentOrderId: string
  nombreLocal: string
  supplierNombre: string
  puedePagar: boolean
}

export default function HistorialProveedor({ historial, currentOrderId, nombreLocal, supplierNombre, puedePagar }: Props) {
  const router = useRouter()
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [modalAbierto, setModalAbierto] = useState(false)
  const [metodoPago, setMetodoPago] = useState('transferencia')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)

  function totalCalculadoDe(oc: HistorialOC) {
    const confirmado = ['confirmada','preparando','en_transito','recibida_parcial','recibida_completa'].includes(oc.estado)
    const itemsVisibles = (oc.purchase_order_items ?? []).filter(i =>
      i.cantidad_solicitada > 0 && !(confirmado && i.disponible_proveedor === false)
    )
    const calculado = itemsVisibles.reduce((s, i) =>
      s + i.cantidad_solicitada * (i.precio_aceptado ?? i.precio_cotizado ?? i.precio_unitario), 0)
    return calculado || (oc.total ?? 0)
  }

  const totalEnviados  = historial.filter(o => ['en_transito','recibida_parcial','recibida_completa'].includes(o.estado))
  const totalCompletos = historial.filter(o => o.estado === 'recibida_completa').length
  const totalMonto     = totalEnviados.reduce((s, o) => s + (o.total ?? 0), 0)
  const totalPagadas   = totalEnviados.filter(o => totalCalculadoDe(o) > 0 && o.monto_pagado >= totalCalculadoDe(o)).length

  function toggleSeleccion(ocId: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(ocId)) next.delete(ocId)
      else next.add(ocId)
      return next
    })
  }

  const ocsSeleccionadas = historial.filter(o => seleccionadas.has(o.id))
  const sumaPendiente = ocsSeleccionadas.reduce((s, o) => s + Math.max(0, totalCalculadoDe(o) - o.monto_pagado), 0)

  async function registrarPagoConsolidado() {
    if (seleccionadas.size === 0) return
    setGuardando(true)
    try {
      const res = await fetch('/api/compras/pagos/consolidado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenIds: Array.from(seleccionadas), metodoPago, nota: nota.trim() || undefined }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; totalPagado?: number }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Error al registrar el pago')
        return
      }
      toast.success(`Pago de ${formatCLP(data.totalPagado ?? 0)} registrado en ${seleccionadas.size} orden(es)`)
      setModalAbierto(false)
      setSeleccionadas(new Set())
      setNota('')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-3 pt-2 pb-16">
      {/* Título + stats */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <p className="font-bold text-gray-800 text-base">📋 Tu historial con {nombreLocal}</p>
        <p className="text-xs text-gray-500 mt-0.5">Hola <strong>{supplierNombre}</strong>, aquí tienes todas tus órdenes desde la primera hasta la más reciente.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-700">{historial.length}</p>
            <p className="text-[10px] text-blue-600">Total pedidos</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-700">{totalCompletos}</p>
            <p className="text-[10px] text-green-600">Completados</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-700">{totalPagadas}</p>
            <p className="text-[10px] text-emerald-600">Pagadas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-gray-700">{formatCLP(totalMonto)}</p>
            <p className="text-[10px] text-gray-500">Monto total</p>
          </div>
        </div>
      </div>

      {/* Lista de OCs */}
      <div className="space-y-2">
        {historial.map(oc => {
          const esActual    = oc.id === currentOrderId
          const estadoInfo  = ESTADO_INFO[oc.estado] ?? { label: oc.estado, color: 'bg-gray-100 text-gray-700', icon: '•' }
          const confirmado  = ['confirmada','preparando','en_transito','recibida_parcial','recibida_completa'].includes(oc.estado)
          const itemsVisibles = (oc.purchase_order_items ?? []).filter(i =>
            i.cantidad_solicitada > 0 && !(confirmado && i.disponible_proveedor === false)
          )
          const totalItems = itemsVisibles.length
          const recibidos   = itemsVisibles.filter(i => (i.cantidad_recibida ?? 0) > 0).length
          const totalCalculado = totalCalculadoDe(oc)
          const pendiente = Math.max(0, totalCalculado - oc.monto_pagado)
          const pagadaCompleta = totalCalculado > 0 && pendiente <= 0
          const pagoParcial = oc.monto_pagado > 0 && !pagadaCompleta
          const puedeSeleccionar = puedePagar && pendiente > 0 && ['en_transito','recibida_parcial','recibida_completa'].includes(oc.estado)
          const fechaStr = new Intl.DateTimeFormat('es-CL', {
            timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
          }).format(new Date(oc.created_at))

          return (
            <div key={oc.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${esActual ? 'border-blue-400 ring-2 ring-blue-200' : ''}`}>
              {/* Header */}
              <div className={`px-4 py-3 flex items-center justify-between gap-2 border-b ${esActual ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {puedeSeleccionar && (
                    <input
                      type="checkbox"
                      checked={seleccionadas.has(oc.id)}
                      onChange={() => toggleSeleccion(oc.id)}
                      className="w-4 h-4 rounded accent-emerald-600 shrink-0"
                    />
                  )}
                  <span className="font-mono font-bold text-blue-700 text-sm shrink-0">{oc.numero_oc}</span>
                  {esActual && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold shrink-0">ACTUAL</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${estadoInfo.color}`}>
                    {estadoInfo.icon} {estadoInfo.label}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatCLP(totalCalculado)}</p>
                  <p className="text-[10px] text-gray-400">{fechaStr}</p>
                </div>
              </div>

              {/* Estado de pago */}
              {totalCalculado > 0 && ['en_transito','recibida_parcial','recibida_completa'].includes(oc.estado) && (
                <div className="px-4 py-1.5 border-b">
                  {pagadaCompleta ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">💰 Pagado</span>
                  ) : pagoParcial ? (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Pago parcial: {formatCLP(oc.monto_pagado)} / {formatCLP(totalCalculado)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">Pendiente de pago</span>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="px-4 py-2 space-y-1">
                {itemsVisibles.map(item => {
                  const precioFinal = item.precio_aceptado ?? item.precio_cotizado ?? item.precio_unitario
                  const recibida = item.cantidad_recibida ?? 0
                  const completo = recibida >= item.cantidad_solicitada
                  return (
                    <div key={item.id} className="flex items-center gap-2 py-0.5">
                      <span className={`text-xs w-4 shrink-0 ${completo ? 'text-green-500' : recibida > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                        {completo ? '✓' : recibida > 0 ? '◑' : '○'}
                      </span>
                      <p className="text-xs text-gray-700 flex-1 truncate">{item.nombre}</p>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-gray-500">
                          {recibida > 0 ? `${recibida}/${item.cantidad_solicitada}` : `×${item.cantidad_solicitada}`}
                        </span>
                        {precioFinal > 0 && (
                          <span className="text-[10px] text-gray-400 ml-1.5">{formatCLP(precioFinal)}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between text-[10px] text-gray-400">
                <span>{recibidos}/{totalItems} ítems recibidos</span>
                {oc.costo_envio_total > 0 && <span>Envío: {formatCLP(oc.costo_envio_total)}</span>}
                {oc.fecha_recepcion && (
                  <span>Recibido: {new Date(oc.fecha_recepcion).toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: 'short' })}</span>
                )}
              </div>

              {/* Comprobantes de pago */}
              {(oc.comprobante_pago_urls ?? []).filter(Boolean).length > 0 && (
                <div className="px-4 py-3 border-t">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">🧾 Comprobantes de pago</p>
                  <div className="flex flex-wrap gap-2">
                    {(oc.comprobante_pago_urls ?? []).filter(Boolean).map((url, idx) => {
                      const esPdf = url.toLowerCase().includes('.pdf')
                      return esPdf ? (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] border border-red-200 bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                          📄 PDF {idx + 1}
                        </a>
                      ) : (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Comprobante ${idx + 1}`}
                            className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Barra flotante de pago consolidado */}
      {puedePagar && seleccionadas.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">{seleccionadas.size} orden(es) seleccionada(s)</p>
              <p className="text-base font-bold text-gray-900">{formatCLP(sumaPendiente)}</p>
            </div>
            <button
              onClick={() => setModalAbierto(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              💳 Registrar pago
            </button>
          </div>
        </div>
      )}

      {/* Modal de pago consolidado */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div>
              <p className="font-bold text-gray-900">Registrar pago consolidado</p>
              <p className="text-sm text-gray-500 mt-0.5">{seleccionadas.size} orden(es) — total {formatCLP(sumaPendiente)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Método de pago</label>
                <select
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">🏦 Transferencia</option>
                  <option value="debito">💳 Débito</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Nota (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Transferencia ref. 12345"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={registrarPagoConsolidado}
                disabled={guardando}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {guardando ? 'Guardando...' : `✓ Registrar ${formatCLP(sumaPendiente)}`}
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
                className="px-4 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
