'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCLP } from '@/lib/calculations'
import { PurchaseOrder, Supplier } from '@/types'
import { comprimirArchivos } from '@/lib/imageCompress'

const METODO_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  debito:        'Débito',
  credito:       'Crédito (agregar a deuda proveedor)',
}

interface ArchivoPreview {
  file: File
  previewUrl: string
  isPdf: boolean
}

type Props = {
  oc: PurchaseOrder & { suppliers?: Supplier | null }
}

export default function CerrarCompraForm({ oc }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [metodoPago, setMetodoPago] = useState<string>(oc.metodo_pago ?? '')
  const [notas, setNotas] = useState(oc.notas ?? '')
  const [archivos, setArchivos] = useState<ArchivoPreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  if (!['en_transito', 'recibida_parcial'].includes(oc.estado)) return null

  function agregarArchivos(files: FileList | null) {
    if (!files) return
    const nuevos: ArchivoPreview[] = Array.from(files).map(file => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      isPdf: file.type === 'application/pdf',
    }))
    setArchivos(prev => [...prev, ...nuevos])
  }

  function remover(idx: number) {
    setArchivos(prev => {
      if (prev[idx].previewUrl) URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function recibirPendientes() {
    const items = (oc.purchase_order_items ?? []).filter(i => {
      const extra = i as unknown as Record<string, unknown>
      return i.cantidad_solicitada > 0 && extra.disponible_proveedor !== false && i.cantidad_recibida < i.cantidad_solicitada
    })
    if (items.length === 0) return

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = user
      ? await supabase.from('user_profiles').select('nombre_completo').eq('id', user.id).single()
      : { data: null }
    const nombreUsuario = (perfil as { nombre_completo?: string } | null)?.nombre_completo ?? null

    for (const item of items) {
      const cantidadNuevamenteRecibida = item.cantidad_solicitada - item.cantidad_recibida
      await supabase.from('purchase_order_items').update({ cantidad_recibida: item.cantidad_solicitada }).eq('id', item.id)

      let productId = item.product_id ?? null
      if (!productId) {
        let query = supabase.from('products').select('id').ilike('nombre', item.nombre.trim())
        if (oc.supplier_id) query = query.eq('proveedor_id', oc.supplier_id)
        const { data: match } = await query.limit(1).maybeSingle()
        if (match) {
          productId = match.id
          await supabase.from('purchase_order_items').update({ product_id: productId }).eq('id', item.id)
        } else {
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
              ...(oc.supplier_id ? { proveedor_id: oc.supplier_id } : {}),
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
          const costoNuevo = item.precio_aceptado ?? item.precio_cotizado ?? (item.precio_unitario > 0 ? item.precio_unitario : null) ?? producto.precio_costo ?? 0
          const costoEnvioNuevo = item.costo_envio_prorrateado ?? 0

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
            razon: `Recepción OC ${oc.numero_oc} (cierre de compra)`,
            referencia_id: oc.id,
            referencia_tipo: 'purchase_order',
            usuario_id: user?.id ?? null,
            nombre_usuario: nombreUsuario,
          })
        }
      }
    }
  }

  async function handleCerrar() {
    if (!metodoPago) { toast.error('Selecciona el método de pago'); return }
    setLoading(true)

    try {
      // 1. Recibir cualquier ítem que aún no se haya marcado como recibido —
      // antes esto se saltaba si nunca se usó "Registrar recepción" y el stock
      // del inventario nunca se actualizaba aunque la OC quedara "Recibida".
      await recibirPendientes()

      // 2. Subir comprobantes (comprimidos) via API route
      let urlsSubidas: string[] = []
      if (archivos.length > 0) {
        const comprimidos = await comprimirArchivos(archivos.map(a => a.file), 500)
        const fd = new FormData()
        fd.append('orden_id', oc.id)
        comprimidos.forEach(f => fd.append('archivos', f))
        const res = await fetch('/api/compras/upload-comprobante', { method: 'POST', body: fd })
        const data = await res.json() as { ok?: boolean; urls?: string[]; error?: string }
        if (res.ok && data.ok) {
          urlsSubidas = data.urls ?? []
        } else {
          toast.error('Error al subir comprobantes: ' + (data.error ?? 'desconocido'))
          setLoading(false)
          return
        }
      }

      // 3. Cerrar la OC
      const existingUrls = (oc.comprobante_pago_urls ?? []) as string[]
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          estado: 'recibida_completa',
          metodo_pago: metodoPago,
          notas: notas.trim() || null,
          fecha_recepcion: oc.fecha_recepcion ?? new Date().toISOString(),
          comprobante_pago_urls: [...existingUrls, ...urlsSubidas],
        })
        .eq('id', oc.id)

      if (error) { toast.error('Error al cerrar compra: ' + error.message); setLoading(false); return }

      // 4. Si crédito, actualizar deuda proveedor
      if (metodoPago === 'credito' && oc.supplier_id) {
        const saldoActual = oc.suppliers?.saldo_deudor ?? 0
        await supabase
          .from('suppliers')
          .update({ saldo_deudor: saldoActual + oc.total })
          .eq('id', oc.supplier_id)
      }

      toast.success('Compra cerrada, inventario actualizado' + (urlsSubidas.length ? ` · ${urlsSubidas.length} comprobante(s) adjuntado(s)` : ''))
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelar() {
    if (!confirm('¿Estás seguro de cancelar esta orden de compra?')) return
    setLoading(true)
    const { error } = await supabase
      .from('purchase_orders')
      .update({ estado: 'cancelada' })
      .eq('id', oc.id)
    if (error) toast.error(error.message)
    else { toast.success('Orden cancelada'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-green-800 text-sm">Cerrar compra y registrar pago</p>
          <p className="text-xs text-green-600 mt-0.5">
            Total a pagar: <span className="font-bold">{formatCLP(oc.total)}</span>
          </p>
        </div>
        <span className="text-2xl">💳</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Método de pago */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Método de pago</label>
          <Select value={metodoPago} onValueChange={v => setMetodoPago(v ?? '')}>
            <SelectTrigger>
              <span className="flex-1 text-left text-sm">
                {metodoPago
                  ? (metodoPago === 'credito' ? 'Crédito (agrega a deuda proveedor)' : METODO_LABELS[metodoPago] ?? metodoPago)
                  : 'Seleccionar método...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METODO_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Notas de pago (opcional)</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Ej: transferencia enviada ref. 123456"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* Comprobantes de pago */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Comprobantes de pago (opcional)</label>
          <p className="text-xs text-gray-400">Puedes subir fotos de transferencias, depósitos, facturas u otros documentos</p>

          {/* Inputs ocultos */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={e => { agregarArchivos(e.target.files); e.target.value = '' }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={e => { agregarArchivos(e.target.files); e.target.value = '' }}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
            >
              📷 Tomar foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
            >
              🖼️ Galería / PDF
            </button>
          </div>

          {/* Previews */}
          {archivos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {archivos.map((a, i) => (
                <div key={i} className="relative group w-20 h-20">
                  {a.isPdf ? (
                    <div className="w-20 h-20 rounded-xl border-2 border-gray-200 bg-red-50 flex flex-col items-center justify-center">
                      <span className="text-2xl">📄</span>
                      <span className="text-[9px] font-bold text-red-600 mt-0.5">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={a.previewUrl}
                      alt={`Comprobante ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-xl border-2 border-gray-200"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => remover(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleCerrar}
            disabled={loading || !metodoPago}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading
              ? (archivos.length > 0 ? 'Subiendo archivos...' : 'Cerrando...')
              : `✓ Confirmar y cerrar compra${archivos.length > 0 ? ` (${archivos.length} comprobante${archivos.length > 1 ? 's' : ''})` : ''}`}
          </Button>
          <Button
            onClick={handleCancelar}
            disabled={loading}
            variant="outline"
            className="text-red-500 hover:text-red-700 hover:border-red-300"
          >
            Cancelar OC
          </Button>
        </div>
      </div>
    </div>
  )
}
