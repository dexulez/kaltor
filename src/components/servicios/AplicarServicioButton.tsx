'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'

interface Servicio {
  id: string; nombre: string; tipo_reparacion: string; precio_base: number; tiempo_estimado_min: number | null
  repair_service_items: { product_id: string | null; nombre: string; cantidad: number; precio_costo: number }[]
}

export default function AplicarServicioButton({ otId }: { otId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(false)
  const [aplicando, setAplicando] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.from('repair_services')
      .select('*, repair_service_items(*)')
      .eq('activo', true)
      .order('tipo_reparacion').order('nombre')
      .then(({ data }) => setServicios((data ?? []) as Servicio[]))
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function aplicar(s: Servicio) {
    setAplicando(s.id)

    // Actualizar tipo y presupuesto en la OT
    await supabase.from('repair_orders').update({
      tipo_reparacion: s.tipo_reparacion,
      presupuesto_estimado: s.precio_base,
    }).eq('id', otId)

    // Registrar el uso del servicio (para analytics)
    await supabase.from('repair_order_services').insert({
      repair_order_id: otId,
      service_id: s.id,
    }).then(r => r) // silenciar error si la tabla no existe aún

    // Agregar repuestos a repair_items
    if (s.repair_service_items?.length) {
      await supabase.from('repair_items').insert(
        s.repair_service_items.map(i => ({
          repair_order_id: otId,
          product_id: i.product_id || null,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio_costo: i.precio_costo,
          costo_envio: 0,
        }))
      )
    }

    toast.success(`Servicio "${s.nombre}" aplicado`)
    setOpen(false)
    setAplicando(null)
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50">
        🔩 Aplicar servicio
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="font-bold text-gray-800">Seleccionar servicio</p>
                <p className="text-xs text-gray-400">Aplica una plantilla de servicio a esta OT</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {loading && <p className="text-center py-8 text-gray-400 text-sm">Cargando...</p>}
              {!loading && servicios.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Sin servicios definidos</p>
                  <a href="/servicios/nuevo" className="text-xs text-blue-600 hover:underline mt-1 block">Crear servicio →</a>
                </div>
              )}
              {servicios.map(s => {
                const costoRep = (s.repair_service_items ?? []).reduce((sum, i) => sum + i.precio_costo * i.cantidad, 0)
                const margen = costoRep > 0 ? Math.round(((s.precio_base - costoRep) / costoRep) * 100) : null
                return (
                  <button key={s.id} onClick={() => aplicar(s)} disabled={aplicando === s.id}
                    className="w-full text-left bg-gray-50 hover:bg-blue-50 border hover:border-blue-400 rounded-xl p-4 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{s.nombre}</p>
                        {costoRep > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {s.repair_service_items?.length} repuesto(s) · Costo: {formatCLP(costoRep)}
                          </p>
                        )}
                        {s.tiempo_estimado_min && <p className="text-xs text-gray-400">⏱ {s.tiempo_estimado_min} min</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-blue-700">{formatCLP(s.precio_base)}</p>
                        {margen !== null && (
                          <p className={`text-xs font-medium ${margen >= 50 ? 'text-green-600' : margen >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                            {margen}% margen
                          </p>
                        )}
                      </div>
                    </div>
                    {aplicando === s.id && <p className="text-xs text-blue-600 mt-1 font-medium">Aplicando...</p>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
