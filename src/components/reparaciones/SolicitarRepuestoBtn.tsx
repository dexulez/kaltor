'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { crearNotificacion } from '@/lib/notifications'

interface Props {
  otNumero: string
  producto: { id: string | null; nombre: string; precio_costo: number }
}

interface Proveedor { id: string; nombre: string }

export default function SolicitarRepuestoBtn({ otNumero, producto }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedorId, setProveedorId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open || proveedores.length > 0) return
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setProveedores((data ?? []) as Proveedor[]))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function solicitar() {
    if (!proveedorId) { toast.error('Selecciona un proveedor'); return }
    const cant = parseInt(cantidad) || 1
    setGuardando(true)

    const MARCA_BORRADOR = '[SOLICITUD]'

    // Buscar orden borrador existente para ese proveedor (identificada por notas)
    const { data: borrador } = await supabase
      .from('purchase_orders')
      .select('id, numero_oc')
      .eq('supplier_id', proveedorId)
      .eq('estado', 'pendiente')
      .like('notas', `${MARCA_BORRADOR}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let ordenId: string
    let ordenNumero: string

    if (borrador) {
      ordenId = borrador.id
      ordenNumero = borrador.numero_oc
    } else {
      // Crear nueva solicitud como OC pendiente con marca especial en notas
      const { data: nueva, error } = await supabase.from('purchase_orders').insert({
        supplier_id: proveedorId,
        estado: 'pendiente',
        metodo_pago: 'transferencia',
        costo_envio_total: 0,
        total: 0,
        notas: `${MARCA_BORRADOR} Solicitud desde OTs`,
      }).select('id, numero_oc').single()
      if (error || !nueva) { toast.error('Error al crear solicitud: ' + error?.message); setGuardando(false); return }
      ordenId = nueva.id
      ordenNumero = nueva.numero_oc
    }

    // Verificar si el producto ya está en esa orden
    const { data: itemExistente } = await supabase
      .from('purchase_order_items')
      .select('id, cantidad_solicitada')
      .eq('purchase_order_id', ordenId)
      .eq('product_id', producto.id ?? '')
      .maybeSingle()

    if (itemExistente) {
      // Incrementar cantidad
      await supabase.from('purchase_order_items')
        .update({ cantidad_solicitada: itemExistente.cantidad_solicitada + cant })
        .eq('id', itemExistente.id)
    } else {
      // Agregar nuevo item
      const { error: itemErr } = await supabase.from('purchase_order_items').insert({
        purchase_order_id: ordenId,
        product_id: producto.id || null,
        nombre: producto.nombre,
        cantidad_solicitada: cant,
        cantidad_recibida: 0,
        precio_unitario: producto.precio_costo,
        costo_envio_prorrateado: 0,
        subtotal: producto.precio_costo * cant,
      })
      if (itemErr) { toast.error('Error al agregar item: ' + itemErr.message); setGuardando(false); return }
    }

    // Recalcular total de la orden
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('subtotal')
      .eq('purchase_order_id', ordenId)
    const nuevoTotal = (items ?? []).reduce((s: number, i: { subtotal: number }) => s + (i.subtotal ?? 0), 0)
    await supabase.from('purchase_orders').update({ total: nuevoTotal }).eq('id', ordenId)

    const prov = proveedores.find(p => p.id === proveedorId)
    await crearNotificacion({
      tipo: 'solicitud_compra',
      titulo: `Repuesto solicitado — ${ordenNumero}`,
      mensaje: `${producto.nombre} (×${cant}) → ${prov?.nombre ?? 'proveedor'}`,
      url: `/compras/orden/${ordenId}`,
    })
    toast.success(`Agregado a solicitud ${ordenNumero} — ${prov?.nombre ?? ''}`)
    setOpen(false)
    setGuardando(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 font-medium transition-colors"
        title="Sin stock — solicitar a proveedor"
      >
        🛒 Solicitar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-800">Solicitar a proveedor</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{producto.nombre}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 ml-3">✕</button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
              Sin stock en inventario. Se agregará a una orden de compra borrador para el proveedor seleccionado.
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Proveedor</label>
              <select
                value={proveedorId}
                onChange={e => setProveedorId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Cantidad a solicitar</label>
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
              />
            </div>

            <div className="text-xs text-gray-400">
              OT de referencia: <span className="font-mono font-semibold text-gray-600">{otNumero}</span>
            </div>

            <Button
              onClick={solicitar}
              disabled={guardando || !proveedorId}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {guardando ? 'Agregando...' : '🛒 Agregar a solicitud de compra'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
