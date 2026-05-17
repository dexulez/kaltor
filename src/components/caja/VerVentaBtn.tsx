'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/calculations'

const TZ = 'America/Santiago'

interface SaleItem {
  id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  precio_costo: number
}

interface VentaDetalle {
  id: string
  numero_venta: string
  tipo: string
  tipo_documento: string
  metodo_pago: string
  subtotal: number
  iva: number
  ppm: number
  descuento: number
  total: number
  created_at: string
  anulada: boolean
  repair_order_id: string | null
  customers: { nombre: string; telefono: string } | null
  items: SaleItem[]
  ot_numero?: string | null
}

interface Props {
  ventaId: string
  numeroVenta: string
}

const TIPO_DOC: Record<string, string> = {
  boleta: '🧾 Boleta', factura: '📄 Factura', presupuesto: '📋 Presupuesto',
}
const METODO: Record<string, string> = {
  efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia',
  debito: '💳 Débito', credito: '💳 Crédito',
}

export default function VerVentaBtn({ ventaId, numeroVenta }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [venta, setVenta] = useState<VentaDetalle | null>(null)

  async function abrir() {
    setOpen(true)
    if (venta) return  // ya cargada
    setLoading(true)

    const [{ data: v }, { data: items }] = await Promise.all([
      supabase.from('sales')
        .select('id, numero_venta, tipo, tipo_documento, metodo_pago, subtotal, iva, ppm, descuento, total, created_at, anulada, repair_order_id, customers(nombre, telefono)')
        .eq('id', ventaId).single(),
      supabase.from('sale_items')
        .select('id, nombre, cantidad, precio_unitario, subtotal, precio_costo')
        .eq('sale_id', ventaId).order('id'),
    ])

    if (!v) { setLoading(false); return }
    const det = v as unknown as VentaDetalle
    det.items = (items ?? []) as SaleItem[]

    // Si es reparación, buscar número OT
    if (det.repair_order_id) {
      const { data: ot } = await supabase.from('repair_orders')
        .select('numero_ot').eq('id', det.repair_order_id).single()
      det.ot_numero = (ot as { numero_ot: string } | null)?.numero_ot ?? null
    }

    setVenta(det)
    setLoading(false)
  }

  const margenTotal = venta ? venta.items.reduce((s, it) => s + (it.subtotal - it.precio_costo * it.cantidad), 0) : 0

  return (
    <>
      <button
        onClick={abrir}
        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
        title="Ver detalle de venta"
      >
        👁
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <p className="font-bold text-gray-900 font-mono">{numeroVenta}</p>
                {venta && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(venta.created_at).toLocaleString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">Cargando...</div>
            ) : venta ? (
              <div className="flex-1 overflow-y-auto">
                {/* Badges */}
                <div className="px-5 py-3 flex flex-wrap gap-2 border-b">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${venta.anulada ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {venta.anulada ? '❌ Anulada' : '✅ Procesada'}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                    {venta.tipo === 'reparacion' ? '🔧 Reparación' : '🛒 Venta directa'}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {TIPO_DOC[venta.tipo_documento] ?? venta.tipo_documento}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {METODO[venta.metodo_pago] ?? venta.metodo_pago}
                  </span>
                </div>

                {/* Cliente y OT */}
                <div className="px-5 py-3 border-b space-y-1">
                  {(venta.customers as { nombre: string; telefono: string } | null) && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Cliente:</span>
                      <span className="font-medium">{(venta.customers as { nombre: string }).nombre}</span>
                      <span className="text-gray-400 text-xs">{(venta.customers as { nombre: string; telefono: string }).telefono}</span>
                    </div>
                  )}
                  {venta.ot_numero && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">OT:</span>
                      <span className="font-mono font-bold text-blue-700">{venta.ot_numero}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="px-5 py-3 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos / Servicios ({venta.items.length})</p>
                  <div className="space-y-2">
                    {venta.items.map(it => (
                      <div key={it.id} className="flex items-start justify-between gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{it.nombre}</p>
                          <p className="text-xs text-gray-400">{it.cantidad} × {formatCLP(it.precio_unitario)}</p>
                        </div>
                        <p className="font-bold text-gray-900 shrink-0">{formatCLP(it.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales */}
                <div className="px-5 py-4 space-y-1.5">
                  {venta.descuento > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Descuento</span><span>- {formatCLP(venta.descuento)}</span>
                    </div>
                  )}
                  {venta.tipo_documento !== 'presupuesto' && (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Neto</span><span>{formatCLP(venta.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>IVA (19%)</span><span>{formatCLP(venta.iva)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 text-gray-900">
                    <span>TOTAL</span><span className="text-blue-700">{formatCLP(venta.total)}</span>
                  </div>
                  {margenTotal > 0 && (
                    <div className="flex justify-between text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mt-1">
                      <span>Margen bruto estimado</span><span className="font-semibold">{formatCLP(margenTotal)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">Sin datos</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
