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
  configEmail?: string | null
  configLogo?: string | null
}

export default function ReprintVentaBtn({ ventaId, numeroVenta, configNombreLocal, configRut, configDireccion, configTelefono, configEmail, configLogo }: Props) {
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
      email: configEmail,
      logo_url: configLogo,
    }, formato)

    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
        title="Reimprimir ticket"
      >
        🖨️
      </button>

      {/* Modal centrado fijo — funciona en cualquier tamaño de pantalla */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">Reimprimir ticket</p>
                <p className="text-xs text-gray-500 font-mono">{numeroVenta}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            {/* Selector de formato */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Formato de impresión</p>
              <div className="grid grid-cols-3 gap-2">
                {TICKET_FORMATOS.map(f => (
                  <button key={f.key} type="button" onClick={() => setFormato(f.key)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-colors ${formato === f.key ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                    <span className="text-2xl">{f.icon}</span>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{f.label}</p>
                    <p className="text-xs text-gray-400 leading-tight">{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={reimprimir}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Cargando...' : '🖨️ Imprimir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
