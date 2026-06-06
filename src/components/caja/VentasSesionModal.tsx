'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/calculations'
import VerVentaBtn from '@/components/caja/VerVentaBtn'
import ReprintVentaBtn from '@/components/caja/ReprintVentaBtn'
import { labelTipoEquipo } from '@/lib/tipoEquipo'

const TZ = 'America/Santiago'

interface VentaRow {
  id: string
  numero_venta: string
  tipo: string
  total: number
  metodo_pago: string
  tipo_documento: string
  created_at: string
  anulada: boolean
  customers: { nombre: string } | null
  sale_items: { nombre: string; cantidad: number }[]
  repair_orders: { numero_ot: string; equipment: { tipo_equipo?: string | null; marca: string; modelo: string } | null } | null
}

interface Props {
  aperturaAt: string
  cierreAt: string
  fecha: string
  ticketConfig: {
    nombre_local: string
    rut_local?: string | null
    direccion?: string | null
    telefono?: string | null
    email?: string | null
    logo_url?: string | null
  }
}

const METODO: Record<string, string> = {
  efectivo: '💵 Efectivo', transferencia: '🏦 Transfer.',
  debito: '💳 Débito', credito: '💳 Crédito',
}

export default function VentasSesionModal({ aperturaAt, cierreAt, fecha, ticketConfig }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ventas, setVentas] = useState<VentaRow[]>([])

  async function abrir() {
    setOpen(true)
    if (ventas.length > 0) return
    setLoading(true)
    const { data } = await supabase.from('sales').select(`
      id, numero_venta, tipo, total, metodo_pago, tipo_documento, created_at, anulada,
      customers(nombre),
      sale_items(nombre, cantidad),
      repair_orders(numero_ot, equipment(tipo_equipo, marca, modelo))
    `)
      .gte('created_at', aperturaAt)
      .lte('created_at', cierreAt)
      .order('created_at', { ascending: false })
    setVentas((data ?? []) as unknown as VentaRow[])
    setLoading(false)
  }

  const activas  = ventas.filter(v => !v.anulada)
  const anuladas = ventas.filter(v => v.anulada)
  const totalSesion = activas.reduce((s, v) => s + v.total, 0)
  const porMetodo = activas.reduce((acc, v) => {
    acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total; return acc
  }, {} as Record<string, number>)

  return (
    <>
      <button
        onClick={abrir}
        className="text-xs text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors font-medium"
      >
        🧾 Ver ventas
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end lg:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            className="bg-white w-full lg:max-w-3xl lg:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-indigo-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold">Ventas de la sesión</p>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {fecha} · {new Date(aperturaAt).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })} → {new Date(cierreAt).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">✕</button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">Cargando ventas...</div>
            ) : (
              <>
                {/* Resumen rápido */}
                <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3 shrink-0">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="font-bold text-indigo-800">Total: {formatCLP(totalSesion)}</span>
                    <span className="text-gray-500">{activas.length} venta{activas.length !== 1 ? 's' : ''}{anuladas.length > 0 ? ` · ${anuladas.length} anulada${anuladas.length !== 1 ? 's' : ''}` : ''}</span>
                    {Object.entries(porMetodo).map(([m, t]) => (
                      <span key={m} className="text-gray-600">{METODO[m] ?? m}: <strong>{formatCLP(t)}</strong></span>
                    ))}
                  </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto divide-y">
                  {ventas.length === 0 ? (
                    <p className="text-center py-12 text-gray-400 text-sm">Sin ventas en esta sesión</p>
                  ) : ventas.map(v => {
                    const cliente = Array.isArray(v.customers) ? (v.customers as {nombre:string}[])[0] : v.customers
                    const ot = Array.isArray(v.repair_orders) ? (v.repair_orders as typeof v.repair_orders[])[0] : v.repair_orders
                    const eq = ot?.equipment
                    const equipoDesc = eq ? [labelTipoEquipo(eq.tipo_equipo), eq.marca, eq.modelo].filter(Boolean).join(' ') : null
                    const items = Array.isArray(v.sale_items) ? v.sale_items : []
                    const preview = v.tipo === 'reparacion' && ot
                      ? `${ot.numero_ot}${equipoDesc ? ' · ' + equipoDesc : ''}`
                      : items.length >= 1
                        ? `${items[0].nombre}${items.length > 1 ? ` + ${items.length - 1} más` : ''}`
                        : null

                    return (
                      <div key={v.id} className={`px-5 py-3 flex items-start gap-3 ${v.anulada ? 'opacity-50 bg-red-50' : 'hover:bg-gray-50'}`}>
                        {/* Hora */}
                        <div className="shrink-0 text-xs text-gray-400 pt-0.5 w-14 text-right">
                          {new Date(v.created_at).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-xs font-semibold text-gray-600">{v.numero_venta}</p>
                            {v.anulada && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Anulada</span>}
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${v.tipo === 'reparacion' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {v.tipo === 'reparacion' ? '🔧 OT' : '🛒 Directa'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{cliente?.nombre ?? 'Sin cliente'}</p>
                          {preview && (
                            <p className="text-xs text-blue-700 font-medium truncate mt-0.5">{preview}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{v.metodo_pago} · {v.tipo_documento}</p>
                        </div>

                        {/* Total y acciones */}
                        <div className="shrink-0 text-right flex flex-col items-end gap-1">
                          <p className={`font-bold ${v.anulada ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{formatCLP(v.total)}</p>
                          <div className="flex items-center gap-1">
                            <VerVentaBtn ventaId={v.id} numeroVenta={v.numero_venta} />
                            <ReprintVentaBtn
                              ventaId={v.id}
                              numeroVenta={v.numero_venta}
                              configNombreLocal={ticketConfig.nombre_local}
                              configRut={ticketConfig.rut_local}
                              configDireccion={ticketConfig.direccion}
                              configTelefono={ticketConfig.telefono}
                              configEmail={ticketConfig.email}
                              configLogo={ticketConfig.logo_url}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="border-t bg-gray-50 px-5 py-3 flex justify-between items-center shrink-0">
                  <p className="text-xs text-gray-400">Haz clic en 👁 para ver el detalle o 🖨️ para reimprimir</p>
                  <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white">Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

