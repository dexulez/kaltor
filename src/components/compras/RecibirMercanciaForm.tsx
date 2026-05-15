'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PurchaseOrder } from '@/types'
import { formatCLP } from '@/lib/calculations'
import QRScanner from '@/components/shared/QRScanner'
import { parseProductoQR } from '@/components/shared/ProductoQRCode'

interface Props {
  oc: PurchaseOrder
}

export default function RecibirMercanciaForm({ oc }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [numeroFactura, setNumeroFactura] = useState((oc as unknown as Record<string, unknown>).numero_factura_proveedor as string ?? '')
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries((oc.purchase_order_items ?? []).map(i => [i.id, i.cantidad_recibida]))
  )

  if (!oc.purchase_order_items?.length) return null
  if (['recibida_completa', 'cancelada'].includes(oc.estado)) return null

  function setCant(id: string, v: number) {
    setCantidades(prev => ({ ...prev, [id]: v }))
  }

  function handleQRScan(value: string) {
    setShowScanner(false)
    const productId = parseProductoQR(value)
    if (!productId) {
      toast.error('Código QR no reconocido')
      return
    }
    const items = oc.purchase_order_items ?? []
    const item = items.find(i => i.product_id === productId)
    if (!item) {
      toast.error('Producto no encontrado en esta orden de compra')
      return
    }
    const cantActual = cantidades[item.id] ?? item.cantidad_recibida
    const nuevaCant = Math.min(item.cantidad_solicitada, cantActual + 1)
    setCantidades(prev => ({ ...prev, [item.id]: nuevaCant }))
    toast.success(`+1 a "${item.nombre}" → ${nuevaCant}/${item.cantidad_solicitada}`)
  }

  async function handleRecibir() {
    setLoading(true)
    const items = oc.purchase_order_items ?? []

    for (const item of items) {
      const nuevaCantidad = cantidades[item.id] ?? item.cantidad_recibida
      const cantidadNuevamenteRecibida = nuevaCantidad - item.cantidad_recibida
      if (cantidadNuevamenteRecibida <= 0) continue

      await supabase.from('purchase_order_items').update({ cantidad_recibida: nuevaCantidad }).eq('id', item.id)

      if (item.product_id) {
        const { data: producto } = await supabase.from('products').select('stock_actual, precio_costo, costo_envio').eq('id', item.product_id).single()
        if (producto) {
          const stockAnterior = producto.stock_actual
          const stockNuevo = stockAnterior + cantidadNuevamenteRecibida

          // Calcular costo promedio ponderado con el nuevo lote
          const costoAnterior = (producto.precio_costo ?? 0)
          const costoNuevo = item.precio_unitario ?? 0
          const costoEnvioNuevo = item.costo_envio_prorrateado ?? 0
          const costoPromedio = stockAnterior > 0
            ? Math.round((costoAnterior * stockAnterior + costoNuevo * cantidadNuevamenteRecibida) / stockNuevo)
            : costoNuevo

          await supabase.from('products').update({
            stock_actual: stockNuevo,
            activo: true,
            precio_costo: costoPromedio,
            ...(costoEnvioNuevo > 0 ? { costo_envio: costoEnvioNuevo } : {}),
          }).eq('id', item.product_id)
          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            tipo: 'entrada',
            cantidad: cantidadNuevamenteRecibida,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            razon: `Recepción OC ${oc.numero_oc}`,
            referencia_id: oc.id,
            referencia_tipo: 'purchase_order',
          })
        }
      }
    }

    const totalSolicitado = items.reduce((s, i) => s + i.cantidad_solicitada, 0)
    const totalRecibido = items.reduce((s, i) => s + (cantidades[i.id] ?? i.cantidad_recibida), 0)

    const nuevoEstado = totalRecibido >= totalSolicitado
      ? 'recibida_completa'
      : totalRecibido > 0
        ? 'recibida_parcial'
        : 'en_transito'

    await supabase.from('purchase_orders').update({
      estado: nuevoEstado,
      fecha_recepcion: new Date().toISOString(),
      ...(numeroFactura.trim() ? { numero_factura_proveedor: numeroFactura.trim() } : {}),
    }).eq('id', oc.id)

    toast.success('Recepción registrada correctamente')
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      {showScanner && (
        <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-amber-800 text-sm">Registrar recepción de mercancía</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScanner(true)}
              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              📷 Escanear QR
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-amber-800 shrink-0">N° Factura proveedor</label>
            <input
              type="text"
              value={numeroFactura}
              onChange={e => setNumeroFactura(e.target.value)}
              placeholder="Ej: 001234 (opcional)"
              className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        </div>
        <div className="divide-y">
          {(oc.purchase_order_items ?? []).map(item => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">{item.nombre}</p>
                <p className="text-xs text-gray-400">Precio unit.: {formatCLP(item.precio_unitario)}</p>
              </div>
              <div className="text-center text-sm text-gray-500 w-24">
                <p className="text-xs text-gray-400 mb-1">Solicitado</p>
                <p className="font-bold text-gray-700">{item.cantidad_solicitada}</p>
              </div>
              <div className="w-28">
                <p className="text-xs text-gray-400 mb-1 text-center">Recibido</p>
                <Input
                  type="number"
                  min={item.cantidad_recibida}
                  max={item.cantidad_solicitada}
                  value={cantidades[item.id] ?? item.cantidad_recibida}
                  onChange={e => setCant(item.id, Math.min(item.cantidad_solicitada, Math.max(item.cantidad_recibida, parseInt(e.target.value) || 0)))}
                  className="text-center h-8 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t bg-gray-50">
          <Button onClick={handleRecibir} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
            {loading ? 'Registrando...' : 'Confirmar recepción'}
          </Button>
        </div>
      </div>
    </>
  )
}
