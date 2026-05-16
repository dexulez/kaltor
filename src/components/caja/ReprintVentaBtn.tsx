'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { imprimirTicketVenta, TICKET_FORMATOS, TicketFormato } from '@/lib/ticketPrint'

interface Props {
  ventaId: string
  numeroVenta: string
  configNombreLocal: string
  configRut?: string | null
  configDireccion?: string | null
  configTelefono?: string | null
}

export default function ReprintVentaBtn({ ventaId, numeroVenta, configNombreLocal, configRut, configDireccion, configTelefono }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [formato, setFormato] = useState<TicketFormato>('ticket80')
  const [loading, setLoading] = useState(false)

  async function reimprimir() {
    setLoading(true)
    const [{ data: venta }, { data: items }] = await Promise.all([
      supabase.from('sales').select('numero_venta, created_at, tipo_documento, metodo_pago, subtotal, iva, ppm, descuento, total, customers(nombre)').eq('id', ventaId).single(),
      supabase.from('sale_items').select('nombre, cantidad, precio_unitario, subtotal').eq('sale_id', ventaId).order('id'),
    ])
    setLoading(false)
    if (!venta) return

    const v = venta as {
      numero_venta: string; created_at: string; tipo_documento: string; metodo_pago: string
      subtotal: number; iva: number; ppm: number; descuento: number; total: number
      customers: { nombre: string } | { nombre: string }[] | null
    }
    const nombreCliente = Array.isArray(v.customers) ? v.customers[0]?.nombre : v.customers?.nombre

    imprimirTicketVenta({
      numero_venta: v.numero_venta,
      created_at: v.created_at,
      tipo_documento: v.tipo_documento,
      metodo_pago: v.metodo_pago,
      cliente_nombre: nombreCliente ?? null,
      items: (items ?? []) as { nombre: string; cantidad: number; precio_unitario: number; subtotal: number }[],
      subtotal: v.subtotal,
      iva: v.iva ?? 0,
      ppm: v.ppm ?? 0,
      descuento: v.descuento ?? 0,
      total: v.total,
    }, {
      nombre_local: configNombreLocal,
      rut_local: configRut,
      direccion: configDireccion,
      telefono: configTelefono,
    }, formato)

    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
        title="Reimprimir ticket"
      >
        🖨️
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-52 space-y-2" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reimprimir {numeroVenta}</p>
            <div className="space-y-1">
              {TICKET_FORMATOS.map(f => (
                <button key={f.key} type="button" onClick={() => setFormato(f.key)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${formato === f.key ? 'bg-blue-50 border border-blue-300 font-medium' : 'hover:bg-gray-50 border border-transparent'}`}>
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                  <span className="text-xs text-gray-400 ml-auto">{f.desc}</span>
                </button>
              ))}
            </div>
            <button
              onClick={reimprimir}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Cargando...' : '🖨️ Imprimir'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
