'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCLP } from '@/lib/calculations'

const ESTADOS = [
  { value: 'pendiente',         label: 'Pendiente' },
  { value: 'en_transito',       label: 'En tránsito' },
  { value: 'recibida_parcial',  label: 'Recibida parcial' },
  { value: 'recibida_completa', label: 'Recibida completa' },
  { value: 'cancelada',         label: 'Cancelada' },
]

const METODOS = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'debito',        label: '💳 Débito' },
  { value: 'credito',       label: '💳 Crédito' },
]

interface ItemOC {
  id: string
  nombre: string
  cantidad_solicitada: number
  cantidad_recibida: number
  precio_unitario: number
  product_id: string | null
  subtotal: number
  // para rastrear el valor original y calcular delta de stock
  _cantRecibidaOriginal: number
  _esNuevo: boolean
  _eliminar: boolean
}

interface Proveedor { id: string; nombre: string }

interface OrdenEditable {
  id: string
  numero_oc: string
  supplier_id: string
  metodo_pago: string | null
  costo_envio_total: number
  fecha_estimada_llegada: string | null
  notas: string | null
  estado: string
  total: number
  purchase_order_items: {
    id: string; nombre: string; cantidad_solicitada: number
    cantidad_recibida: number; precio_unitario: number
    product_id?: string | null; subtotal: number
  }[]
}

interface Props {
  oc: OrdenEditable
  proveedores: Proveedor[]
}

export default function EditarOrdenForm({ oc, proveedores }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  // Cabecera
  const [supplierId, setSupplierId] = useState(oc.supplier_id)
  const [metodo, setMetodo] = useState(oc.metodo_pago ?? 'transferencia')
  const [costoEnvio, setCostoEnvio] = useState(String(oc.costo_envio_total))
  const [fechaLlegada, setFechaLlegada] = useState(oc.fecha_estimada_llegada?.split('T')[0] ?? '')
  const [notas, setNotas] = useState(oc.notas ?? '')
  const [estado, setEstado] = useState(oc.estado)

  // Ítems
  const [items, setItems] = useState<ItemOC[]>(
    oc.purchase_order_items.map(i => ({
      ...i,
      product_id: i.product_id ?? null,
      _cantRecibidaOriginal: i.cantidad_recibida,
      _esNuevo: false,
      _eliminar: false,
    }))
  )

  const proveedorLabel = proveedores.find(p => p.id === supplierId)?.nombre ?? 'Seleccionar...'

  function setItem(id: string, campo: keyof ItemOC, valor: unknown) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [campo]: valor } : i))
  }

  function agregarItem() {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      nombre: '',
      cantidad_solicitada: 1,
      cantidad_recibida: 0,
      precio_unitario: 0,
      product_id: null,
      subtotal: 0,
      _cantRecibidaOriginal: 0,
      _esNuevo: true,
      _eliminar: false,
    }])
  }

  function marcarEliminar(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, _eliminar: !i._eliminar } : i))
  }

  const itemsActivos = items.filter(i => !i._eliminar)
  const subtotalItems = itemsActivos.reduce((s, i) => s + i.precio_unitario * i.cantidad_solicitada, 0)
  const costoEnvioNum = parseFloat(costoEnvio) || 0
  const totalCalculado = subtotalItems + costoEnvioNum

  async function handleGuardar() {
    if (!supplierId) { toast.error('Selecciona un proveedor'); return }
    const itemsValidos = itemsActivos.filter(i => i.nombre.trim())
    if (!itemsValidos.length) { toast.error('Agrega al menos un ítem'); return }

    setSaving(true)

    // 1. Actualizar cabecera
    const { error: errOC } = await supabase.from('purchase_orders').update({
      supplier_id: supplierId,
      metodo_pago: metodo,
      costo_envio_total: costoEnvioNum,
      fecha_estimada_llegada: fechaLlegada || null,
      notas: notas.trim() || null,
      estado,
      total: totalCalculado,
    }).eq('id', oc.id)

    if (errOC) { toast.error('Error al guardar cabecera: ' + errOC.message); setSaving(false); return }

    // 2. Procesar ítems
    for (const item of items) {
      if (item._esNuevo && !item._eliminar) {
        // Insertar ítem nuevo
        await supabase.from('purchase_order_items').insert({
          purchase_order_id: oc.id,
          nombre: item.nombre.trim(),
          cantidad_solicitada: item.cantidad_solicitada,
          cantidad_recibida: item.cantidad_recibida,
          precio_unitario: item.precio_unitario,
          subtotal: item.precio_unitario * item.cantidad_solicitada,
          costo_envio_prorrateado: 0,
          product_id: item.product_id || null,
        })

        // Si tiene cantidad recibida y product_id, actualizar stock
        if (item.cantidad_recibida > 0 && item.product_id) {
          const { data: prod } = await supabase.from('products').select('stock_actual, precio_costo').eq('id', item.product_id).single()
          if (prod) {
            const stockNuevo = prod.stock_actual + item.cantidad_recibida
            const costoPromedio = prod.stock_actual > 0
              ? Math.round((prod.precio_costo * prod.stock_actual + item.precio_unitario * item.cantidad_recibida) / stockNuevo)
              : item.precio_unitario
            await supabase.from('products').update({ stock_actual: stockNuevo, precio_costo: costoPromedio }).eq('id', item.product_id)
            await supabase.from('stock_movements').insert({
              product_id: item.product_id, tipo: 'ajuste',
              cantidad: item.cantidad_recibida, stock_anterior: prod.stock_actual, stock_nuevo: stockNuevo,
              razon: `Corrección OC ${oc.numero_oc} — ítem nuevo`,
              referencia_id: oc.id, referencia_tipo: 'purchase_order',
            })
          }
        }
      } else if (item._eliminar && !item._esNuevo) {
        // Revertir stock si tenía recibidos
        if (item._cantRecibidaOriginal > 0 && item.product_id) {
          const { data: prod } = await supabase.from('products').select('stock_actual').eq('id', item.product_id).single()
          if (prod) {
            const stockNuevo = Math.max(0, prod.stock_actual - item._cantRecibidaOriginal)
            await supabase.from('products').update({ stock_actual: stockNuevo }).eq('id', item.product_id)
            await supabase.from('stock_movements').insert({
              product_id: item.product_id, tipo: 'ajuste',
              cantidad: -item._cantRecibidaOriginal, stock_anterior: prod.stock_actual, stock_nuevo: stockNuevo,
              razon: `Corrección OC ${oc.numero_oc} — ítem eliminado`,
              referencia_id: oc.id, referencia_tipo: 'purchase_order',
            })
          }
        }
        await supabase.from('purchase_order_items').delete().eq('id', item.id)
      } else if (!item._esNuevo && !item._eliminar) {
        // Actualizar ítem existente
        const delta = item.cantidad_recibida - item._cantRecibidaOriginal
        await supabase.from('purchase_order_items').update({
          nombre: item.nombre.trim(),
          cantidad_solicitada: item.cantidad_solicitada,
          cantidad_recibida: item.cantidad_recibida,
          precio_unitario: item.precio_unitario,
          subtotal: item.precio_unitario * item.cantidad_solicitada,
        }).eq('id', item.id)

        // Ajustar stock si cambió cantidad recibida
        if (delta !== 0 && item.product_id) {
          const { data: prod } = await supabase.from('products').select('stock_actual, precio_costo').eq('id', item.product_id).single()
          if (prod) {
            const stockNuevo = Math.max(0, prod.stock_actual + delta)
            const costoPromedio = delta > 0 && prod.stock_actual > 0
              ? Math.round((prod.precio_costo * prod.stock_actual + item.precio_unitario * delta) / stockNuevo)
              : prod.precio_costo
            await supabase.from('products').update({ stock_actual: stockNuevo, precio_costo: costoPromedio }).eq('id', item.product_id)
            await supabase.from('stock_movements').insert({
              product_id: item.product_id, tipo: 'ajuste',
              cantidad: delta, stock_anterior: prod.stock_actual, stock_nuevo: stockNuevo,
              razon: `Corrección OC ${oc.numero_oc}`,
              referencia_id: oc.id, referencia_tipo: 'purchase_order',
            })
          }
        }
      }
    }

    toast.success('Orden de compra actualizada correctamente')
    router.push(`/compras/orden/${oc.id}`)
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Advertencia */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <span className="text-lg shrink-0">⚠️</span>
        <p>Los cambios en <strong>cantidades recibidas</strong> ajustan el stock de inventario automáticamente mediante movimientos de tipo <em>ajuste</em>.</p>
      </div>

      {/* Cabecera */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos de la orden</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select value={supplierId} onValueChange={v => setSupplierId(v ?? '')}>
              <SelectTrigger><span className="text-sm truncate">{proveedorLabel}</span></SelectTrigger>
              <SelectContent>
                {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Select value={metodo} onValueChange={v => setMetodo(v ?? metodo)}>
              <SelectTrigger><span className="text-sm">{METODOS.find(m => m.value === metodo)?.label ?? metodo}</span></SelectTrigger>
              <SelectContent>
                {METODOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={v => setEstado(v ?? estado)}>
              <SelectTrigger><span className="text-sm">{ESTADOS.find(e => e.value === estado)?.label ?? estado}</span></SelectTrigger>
              <SelectContent>
                {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Costo de envío (CLP)</Label>
            <Input type="number" min={0} value={costoEnvio} onChange={e => setCostoEnvio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha estimada de llegada</Label>
            <Input type="date" value={fechaLlegada} onChange={e => setFechaLlegada(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label>Notas</Label>
            <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <p className="font-semibold text-gray-800">Productos de la orden</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">Producto / Ítem</th>
                <th className="text-center px-3 py-2 text-gray-500 font-medium">Solicitado</th>
                <th className="text-center px-3 py-2 text-gray-500 font-medium">Recibido</th>
                <th className="text-right px-3 py-2 text-gray-500 font-medium">P. unitario</th>
                <th className="text-right px-3 py-2 text-gray-500 font-medium">Subtotal</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className={item._eliminar ? 'bg-red-50 opacity-60' : item._esNuevo ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2">
                    <input
                      value={item.nombre}
                      onChange={e => setItem(item.id, 'nombre', e.target.value)}
                      disabled={item._eliminar}
                      className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder="Nombre del producto..."
                    />
                    {item._esNuevo && <span className="text-xs text-blue-500 font-medium">Nuevo</span>}
                    {item._eliminar && <span className="text-xs text-red-500 font-medium">Se eliminará</span>}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min={0}
                      value={item.cantidad_solicitada}
                      onChange={e => setItem(item.id, 'cantidad_solicitada', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                      disabled={item._eliminar}
                      className="w-20 border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min={0}
                      value={item.cantidad_recibida}
                      onChange={e => setItem(item.id, 'cantidad_recibida', parseInt(e.target.value) || 0)}
                      disabled={item._eliminar}
                      className={`w-20 border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50
                        ${item.cantidad_recibida !== item._cantRecibidaOriginal ? 'border-amber-400 bg-amber-50' : ''}`}
                    />
                    {item.cantidad_recibida !== item._cantRecibidaOriginal && !item._eliminar && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        {item.cantidad_recibida > item._cantRecibidaOriginal ? '+' : ''}
                        {item.cantidad_recibida - item._cantRecibidaOriginal} en stock
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min={0}
                      value={item.precio_unitario}
                      onChange={e => setItem(item.id, 'precio_unitario', parseInt(e.target.value) || 0)}
                      disabled={item._eliminar}
                      className="w-28 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">
                    {formatCLP(item.precio_unitario * item.cantidad_solicitada)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => marcarEliminar(item.id)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${item._eliminar ? 'bg-gray-100 text-gray-500 border-gray-300' : 'text-red-500 border-red-200 hover:bg-red-50'}`}
                    >
                      {item._eliminar ? 'Restaurar' : '✕'}
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="px-3 py-3">
                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={agregarItem}>+ Agregar ítem</Button>
                </td>
              </tr>
            </tbody>
            <tfoot className="border-t bg-gray-50">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-medium text-gray-600">Costo de envío</td>
                <td className="px-3 py-2 text-right font-medium">{formatCLP(costoEnvioNum)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-900">Total OC</td>
                <td className="px-3 py-2 text-right font-bold text-gray-900">{formatCLP(totalCalculado)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pb-20 md:pb-4">
        <Button onClick={handleGuardar} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
          {saving ? 'Guardando...' : '💾 Guardar cambios'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </div>
  )
}
