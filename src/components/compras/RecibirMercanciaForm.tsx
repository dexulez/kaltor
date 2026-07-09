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
import { crearNotificacion } from '@/lib/notifications'
import { soundMercanciaRecibida } from '@/lib/sounds'

interface Props {
  oc: PurchaseOrder
}

export default function RecibirMercanciaForm({ oc }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [numeroFactura, setNumeroFactura] = useState((oc as unknown as Record<string, unknown>).numero_factura_proveedor as string ?? '')
  const [costoEnvio, setCostoEnvio] = useState(String((oc as unknown as Record<string, unknown>).costo_envio_total ?? 0))
  const [cantidades, setCantidades] = useState<Record<string, number>>(() => {
    const activos = (oc.purchase_order_items ?? []).filter(i => {
      const extra = i as unknown as Record<string, unknown>
      return i.cantidad_solicitada > 0 && extra.disponible_proveedor !== false
    })
    return Object.fromEntries(activos.map(i => {
      if (i.cantidad_recibida > 0) return [i.id, i.cantidad_recibida]
      const extra = i as unknown as Record<string, unknown>
      const cantProv = extra.cantidad_disponible_proveedor as number | null
      return [i.id, cantProv ?? i.cantidad_solicitada]
    }))
  })

  if (!oc.purchase_order_items?.length) return null
  if (!['en_transito', 'recibida_parcial'].includes(oc.estado)) return null

  // Solo mostrar ítems que el proveedor/admin no descartaron
  const itemsActivos = (oc.purchase_order_items ?? []).filter(i => {
    const extra = i as unknown as Record<string, unknown>
    return i.cantidad_solicitada > 0 && extra.disponible_proveedor !== false
  })

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
    const item = itemsActivos.find(i => i.product_id === productId)
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
    const items = itemsActivos
    // Obtener usuario para log
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = user
      ? await supabase.from('user_profiles').select('nombre_completo').eq('id', user.id).single()
      : { data: null }
    const nombreUsuario = (perfil as { nombre_completo?: string } | null)?.nombre_completo ?? null

    const costoEnvioNum = parseInt(costoEnvio) || 0
    const costoEnvioProrrateado = items.length > 0 ? Math.round(costoEnvioNum / items.length) : 0

    for (const item of items) {
      const nuevaCantidad = cantidades[item.id] ?? item.cantidad_recibida
      const cantidadNuevamenteRecibida = nuevaCantidad - item.cantidad_recibida
      if (cantidadNuevamenteRecibida <= 0) continue

      await supabase.from('purchase_order_items').update({
        cantidad_recibida: nuevaCantidad,
        costo_envio_prorrateado: costoEnvioProrrateado,
      }).eq('id', item.id)

      // Intentar resolver product_id si no está vinculado (item creado manualmente)
      let productId = item.product_id ?? null
      if (!productId) {
        const ocExtra = oc as unknown as Record<string, unknown>
        const supplierId = ocExtra.supplier_id as string | null
        // 1. Buscar por nombre exacto (y proveedor si lo hay)
        let query = supabase.from('products').select('id').ilike('nombre', item.nombre.trim())
        if (supplierId) query = query.eq('proveedor_id', supplierId)
        const { data: match } = await query.limit(1).maybeSingle()
        if (match) {
          productId = match.id
          await supabase.from('purchase_order_items').update({ product_id: productId }).eq('id', item.id)
        } else {
          // 2. No existe → auto-crear en inventario con categoría "Repuestos" por defecto
          const { data: cat } = await supabase
            .from('product_categories').select('id').ilike('nombre', 'repuesto%').limit(1).maybeSingle()
          const categoriaId = (cat as { id: string } | null)?.id
          if (categoriaId) {
            const costoBase = item.precio_aceptado ?? item.precio_cotizado ?? (item.precio_unitario > 0 ? item.precio_unitario : 0)
            const { data: nuevo } = await supabase.from('products').insert({
              nombre: item.nombre.trim(),
              categoria_id: categoriaId,
              precio_costo: costoBase,
              precio_venta: 0,
              stock_actual: 0,
              stock_minimo: 1,
              ...(supplierId ? { proveedor_id: supplierId } : {}),
            }).select('id').single()
            if (nuevo) {
              productId = nuevo.id
              await supabase.from('purchase_order_items').update({ product_id: productId }).eq('id', item.id)
            }
          }
        }
      }

      if (productId) {
        const { data: producto } = await supabase.from('products').select('stock_actual, precio_costo, costo_envio').eq('id', productId).single()
        if (producto) {
          const stockAnterior = producto.stock_actual
          const stockNuevo = stockAnterior + cantidadNuevamenteRecibida
          // Precio confirmado: precio_aceptado > precio_cotizado > precio_unitario (ignorar $0 del original)
          const costoNuevo = item.precio_aceptado ?? item.precio_cotizado ?? (item.precio_unitario > 0 ? item.precio_unitario : null) ?? producto.precio_costo ?? 0
          const costoEnvioNuevo = costoEnvioProrrateado

          await supabase.from('products').update({
            stock_actual: stockNuevo,
            activo: true,
            ...(costoNuevo > 0 ? { precio_costo: costoNuevo } : {}),
            ...(costoEnvioNuevo > 0 ? { costo_envio: costoEnvioNuevo } : {}),
          }).eq('id', productId)
          await supabase.from('stock_movements').insert({
            product_id: productId,
            tipo: 'entrada',
            cantidad: cantidadNuevamenteRecibida,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            razon: `Recepción OC ${oc.numero_oc}`,
            referencia_id: oc.id,
            referencia_tipo: 'purchase_order',
            usuario_id: user?.id ?? null,
            nombre_usuario: nombreUsuario,
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

    const subtotalItems = items.reduce((s, i) => s + (i.subtotal ?? 0), 0)
    await supabase.from('purchase_orders').update({
      estado: nuevoEstado,
      fecha_recepcion: new Date().toISOString(),
      costo_envio_total: costoEnvioNum,
      total: subtotalItems + costoEnvioNum,
      ...(numeroFactura.trim() ? { numero_factura_proveedor: numeroFactura.trim() } : {}),
    }).eq('id', oc.id)

    soundMercanciaRecibida()
    toast.success('Recepción registrada correctamente')

    await crearNotificacion({
      tipo: 'mercancia_recibida',
      titulo: `Mercancía recibida — ${oc.numero_oc}`,
      mensaje: `${Object.keys(cantidades).length} producto(s) recibidos. Stock actualizado.`,
      url: `/compras/orden/${oc.id}`,
    })

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
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-amber-800 shrink-0">Costo de envío real (CLP)</label>
            <input
              type="number"
              min={0}
              value={costoEnvio}
              onChange={e => setCostoEnvio(e.target.value)}
              placeholder="0"
              className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        </div>
        <div className="divide-y">
          {itemsActivos.map(item => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">{item.nombre}</p>
                <p className="text-xs text-gray-400">Precio unit.: {formatCLP(item.precio_aceptado ?? item.precio_cotizado ?? item.precio_unitario)}</p>
              </div>
              <div className="text-center text-sm text-gray-500 w-24">
                <p className="text-xs text-gray-400 mb-1">Solicitado</p>
                <p className="font-bold text-gray-700">{item.cantidad_solicitada}</p>
              </div>
              <div className="w-28">
                <p className="text-xs text-gray-400 mb-1 text-center">Recibido</p>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={cantidades[item.id] ?? item.cantidad_recibida}
                  onChange={e => {
                    const limpio = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                    const n = limpio === '' ? 0 : parseFloat(limpio) || 0
                    setCant(item.id, Math.min(item.cantidad_solicitada, Math.max(item.cantidad_recibida, n)))
                  }}
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
