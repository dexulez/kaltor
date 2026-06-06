'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import { crearNotificacion } from '@/lib/notifications'
import { soundSolicitudCompra, soundError } from '@/lib/sounds'
import { enviarWA, msgOCProveedor } from '@/lib/whatsapp'

interface RepuestoItem {
  id: string; nombre: string; cantidad: number; precio_costo: number; costo_envio: number
}
interface Proveedor { id: string; nombre: string; whatsapp?: string | null }

export default function GenerarOCBtn({ otId, otNumero }: { otId: string; otNumero: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [ocCreada, setOcCreada] = useState<{ id: string; numero: string } | null>(null)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [repuestos, setRepuestos] = useState<RepuestoItem[]>([])
  const [proveedorId, setProveedorId] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([
      supabase.from('suppliers').select('id, nombre, whatsapp').eq('activo', true).order('nombre'),
      supabase.from('repair_items').select('id, nombre, cantidad, precio_costo, costo_envio').eq('repair_order_id', otId),
    ]).then(([{ data: provs }, { data: items }]) => {
      setProveedores((provs ?? []) as Proveedor[])
      setRepuestos((items ?? []) as RepuestoItem[])
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = repuestos.reduce((s, r) => s + (r.precio_costo + r.costo_envio) * r.cantidad, 0)

  async function generar() {
    if (!proveedorId) { toast.error('Selecciona un proveedor'); return }
    if (repuestos.length === 0) { toast.error('No hay repuestos en esta OT'); return }
    setGuardando(true)

    // Buscar solicitud existente para ese proveedor
    const { data: existente } = await supabase
      .from('purchase_orders')
      .select('id, numero_oc')
      .eq('supplier_id', proveedorId)
      .eq('estado', 'pendiente')
      .like('notas', '[SOLICITUD]%')
      .maybeSingle()

    let ordenId: string
    let ordenNumero: string

    if (existente) {
      ordenId = existente.id
      ordenNumero = existente.numero_oc
    } else {
      const { data: nueva, error } = await supabase.from('purchase_orders').insert({
        supplier_id: proveedorId,
        estado: 'pendiente',
        metodo_pago: 'transferencia',
        costo_envio_total: 0,
        total,
        notas: `[SOLICITUD] Generada desde ${otNumero}`,
      }).select('id, numero_oc').single()
      if (error || !nueva) { soundError(); toast.error('Error al crear orden'); setGuardando(false); return }
      ordenId = nueva.id
      ordenNumero = nueva.numero_oc
    }

    // Insertar/actualizar cada repuesto en la OC
    for (const r of repuestos) {
      const { data: existe } = await supabase
        .from('purchase_order_items')
        .select('id, cantidad_solicitada')
        .eq('purchase_order_id', ordenId)
        .eq('nombre', r.nombre)
        .maybeSingle()

      if (existe) {
        await supabase.from('purchase_order_items')
          .update({ cantidad_solicitada: existe.cantidad_solicitada + r.cantidad, subtotal: (existe.cantidad_solicitada + r.cantidad) * r.precio_costo })
          .eq('id', existe.id)
      } else {
        const { error: itemErr } = await supabase.from('purchase_order_items').insert({
          purchase_order_id: ordenId,
          nombre: r.nombre,
          cantidad_solicitada: r.cantidad,
          cantidad_recibida: 0,
          precio_unitario: r.precio_costo,
          costo_envio_prorrateado: 0,
          subtotal: r.precio_costo * r.cantidad,
        })
        if (itemErr) { soundError(); toast.error('Error al agregar item: ' + itemErr.message); setGuardando(false); return }
      }
    }

    // Recalcular total
    const { data: allItems } = await supabase
      .from('purchase_order_items').select('subtotal').eq('purchase_order_id', ordenId)
    const nuevoTotal = (allItems ?? []).reduce((s: number, i: { subtotal: number }) => s + (i.subtotal ?? 0), 0)
    await supabase.from('purchase_orders').update({ total: nuevoTotal }).eq('id', ordenId)

    await crearNotificacion({
      tipo: 'solicitud_compra',
      titulo: `Nueva solicitud de compra ${ordenNumero}`,
      mensaje: `${repuestos.length} repuesto(s) desde ${otNumero} → pendiente de enviar`,
      url: `/compras/orden/${ordenId}`,
    })
    soundSolicitudCompra()
    const proveedor = proveedores.find(p => p.id === proveedorId)
    if (proveedor?.whatsapp) {
      enviarWA(
        proveedor.whatsapp,
        msgOCProveedor(proveedor.nombre, repuestos.map(r => ({ nombre: r.nombre, cantidad: r.cantidad })), ordenNumero, 'Servitec')
      )
    }
    setOcCreada({ id: ordenId, numero: ordenNumero })
    setOpen(false)
    setGuardando(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}
        className="gap-1 text-orange-700 border-orange-300 hover:bg-orange-50">
        🛒 Generar OC
      </Button>

      {/* Alerta post-generación con acceso directo a la OC */}
      {ocCreada && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setOcCreada(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-4xl">✅</p>
            <div>
              <p className="font-bold text-gray-800 text-lg">Solicitud creada</p>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-mono font-semibold text-blue-700">{ocCreada.numero}</span> lista para enviar al proveedor
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push(`/compras/orden/${ocCreada.id}`)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                📋 Ver orden de compra
              </button>
              <button
                onClick={() => setOcCreada(null)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cerrar y seguir en la OT
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md space-y-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <p className="font-bold text-gray-800">Generar orden de compra</p>
                <p className="text-xs text-gray-500 mt-0.5">Repuestos de {otNumero} → proveedor</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Lista de repuestos */}
            <div className="px-5 max-h-48 overflow-y-auto space-y-1">
              {repuestos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin repuestos en esta OT</p>
              ) : repuestos.map(r => (
                <div key={r.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span className="text-gray-700">{r.cantidad}× {r.nombre}</span>
                  <span className="font-medium text-gray-600">{formatCLP(r.precio_costo * r.cantidad)}</span>
                </div>
              ))}
            </div>

            {repuestos.length > 0 && (
              <div className="flex justify-between px-5 text-sm font-semibold text-gray-800">
                <span>Total referencial</span>
                <span>{formatCLP(total)}</span>
              </div>
            )}

            {/* Proveedor */}
            <div className="px-5 pb-5 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Proveedor</label>
                <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <Button onClick={generar} disabled={guardando || !proveedorId || repuestos.length === 0}
                className="w-full bg-orange-600 hover:bg-orange-700">
                {guardando ? 'Generando...' : `🛒 Agregar ${repuestos.length} repuesto(s) a solicitud`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
