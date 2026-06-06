'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCLP } from '@/lib/calculations'
import { Supplier, Product } from '@/types'

interface ItemOC {
  id: string
  product_id: string | null
  nombre: string
  cantidad_solicitada: number
  precio_unitario: number
}

interface Props {
  proveedores: Supplier[]
  productos: Product[]
}

export default function NuevaOrdenCompraForm({ proveedores, productos }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'debito' | 'credito'>('transferencia')
  const [costoEnvio, setCostoEnvio] = useState('0')
  const [fechaEstimada, setFechaEstimada] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemOC[]>([
    { id: crypto.randomUUID(), product_id: null, nombre: '', cantidad_solicitada: 1, precio_unitario: 0 },
  ])
  const [busquedaProducto, setBusquedaProducto] = useState<Record<string, string>>({})
  const proveedorSeleccionado = proveedores.find(p => p.id === supplierId)
  const proveedorValue = proveedorSeleccionado ? supplierId : ''

  function setItem(id: string, field: keyof ItemOC, value: string | number | null) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function agregarItem() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), product_id: null, nombre: '', cantidad_solicitada: 1, precio_unitario: 0 }])
  }

  function quitarItem(id: string) {
    if (items.length === 1) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function seleccionarProducto(itemId: string, producto: Product) {
    setItems(prev => prev.map(i => i.id === itemId ? {
      ...i,
      product_id: producto.id,
      nombre: producto.nombre,
      precio_unitario: producto.precio_costo,
    } : i))
    setBusquedaProducto(prev => ({ ...prev, [itemId]: '' }))
  }

  const costoEnvioNum = parseInt(costoEnvio) || 0
  const subtotalItems = items.reduce((s, i) => s + i.precio_unitario * i.cantidad_solicitada, 0)
  const total = subtotalItems + costoEnvioNum

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) { toast.error('Selecciona un proveedor'); return }
    const itemsValidos = items.filter(i => i.nombre.trim() && i.cantidad_solicitada > 0)
    if (itemsValidos.length === 0) { toast.error('Agrega al menos un producto'); return }
    setLoading(true)

    const { data: oc, error: oe } = await supabase.from('purchase_orders').insert({
      supplier_id: supplierId,
      estado: 'pendiente',
      metodo_pago: metodoPago,
      costo_envio_total: costoEnvioNum,
      total,
      fecha_estimada_llegada: fechaEstimada || null,
      notas: notas.trim() || null,
    }).select().single()

    if (oe) { toast.error('Error al crear OC: ' + oe.message); setLoading(false); return }

    const costoEnvioProrrateado = itemsValidos.length > 0 ? Math.round(costoEnvioNum / itemsValidos.length) : 0

    const itemsPayload = itemsValidos.map(i => ({
      purchase_order_id: oc.id,
      product_id: i.product_id || null,
      nombre: i.nombre.trim(),
      cantidad_solicitada: i.cantidad_solicitada,
      cantidad_recibida: 0,
      precio_unitario: i.precio_unitario,
      costo_envio_prorrateado: costoEnvioProrrateado,
      subtotal: i.precio_unitario * i.cantidad_solicitada,
    }))

    await supabase.from('purchase_order_items').insert(itemsPayload)

    toast.success(`Orden de compra ${oc.numero_oc} creada`)
    router.push(`/compras/orden/${oc.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
      {/* Encabezado */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos de la orden</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Proveedor <span className="text-red-500">*</span></Label>
            <Select value={proveedorValue} onValueChange={(value) => setSupplierId(value ?? '')}>
              <SelectTrigger>
                <span className="truncate text-sm text-left">
                  {proveedorSeleccionado
                    ? proveedorSeleccionado.nombre
                    : supplierId ? 'Proveedor no disponible' : 'Selecciona un proveedor...'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {proveedores.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Select value={metodoPago} onValueChange={v => setMetodoPago(v as typeof metodoPago)}>
              <SelectTrigger>
                <span className="text-sm">{{ efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito' }[metodoPago]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Costo de envío (CLP)</Label>
            <Input type="number" min={0} value={costoEnvio} onChange={e => setCostoEnvio(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha estimada de llegada</Label>
            <Input type="date" value={fechaEstimada} onChange={e => setFechaEstimada(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones, condiciones especiales..." />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <p className="font-semibold text-gray-800">Productos a ordenar</p>
          <Button type="button" variant="outline" size="sm" onClick={agregarItem}>+ Agregar item</Button>
        </div>
        <div className="divide-y">
          {items.map((item) => {
            const busq = busquedaProducto[item.id] ?? ''
            const filtrados = productos.filter(p =>
              p.nombre.toLowerCase().includes(busq.toLowerCase())
            ).slice(0, 6)

            return (
              <div key={item.id} className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-5 space-y-1 relative">
                    <Label className="text-xs">Producto</Label>
                    <Input
                      value={item.nombre}
                      onChange={e => {
                        const val = e.target.value
                        if (item.product_id) setItem(item.id, 'product_id', null)
                        setItem(item.id, 'nombre', val)
                        setBusquedaProducto(prev => ({ ...prev, [item.id]: val }))
                      }}
                      onFocus={() => {
                        if (!item.product_id)
                          setBusquedaProducto(prev => ({ ...prev, [item.id]: item.nombre }))
                      }}
                      onBlur={() => {
                        setBusquedaProducto(prev => ({ ...prev, [item.id]: '' }))
                      }}
                      placeholder="Escribir nombre del repuesto..."
                      className="text-sm"
                      autoComplete="off"
                    />
                    {item.product_id && (
                      <p className="text-[10px] text-green-600 mt-0.5">✓ Producto del inventario</p>
                    )}
                    {busq && !item.product_id && filtrados.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <p className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wide bg-gray-50 border-b">
                          Coincide con el inventario — selecciona o sigue escribiendo
                        </p>
                        {filtrados.map(p => (
                          <button key={p.id} type="button"
                            onMouseDown={e => { e.preventDefault(); seleccionarProducto(item.id, p) }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0">
                            <span className="font-medium">{p.nombre}</span>
                            <span className="text-gray-400 ml-2">{formatCLP(p.precio_costo)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input type="number" min={1} value={item.cantidad_solicitada}
                      onChange={e => setItem(item.id, 'cantidad_solicitada', parseInt(e.target.value) || 1)}
                      className="text-sm" />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Precio unitario</Label>
                    <Input type="number" min={0} value={item.precio_unitario}
                      onChange={e => setItem(item.id, 'precio_unitario', parseInt(e.target.value) || 0)}
                      className="text-sm" />
                  </div>
                  <div className="sm:col-span-2 flex items-end justify-between gap-2 pb-0.5">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Subtotal</Label>
                      <p className="text-sm font-bold text-gray-800 pt-2">{formatCLP(item.precio_unitario * item.cantidad_solicitada)}</p>
                    </div>
                    <button type="button" onClick={() => quitarItem(item.id)}
                      className="text-red-400 hover:text-red-600 text-xl pb-2 disabled:opacity-30"
                      disabled={items.length === 1}>×</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Totales */}
        <div className="bg-gray-50 border-t px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal productos</span><span>{formatCLP(subtotalItems)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Costo de envío</span><span>{formatCLP(costoEnvioNum)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-gray-900 border-t pt-1">
            <span>Total OC</span><span>{formatCLP(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Creando...' : 'Crear orden de compra'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
