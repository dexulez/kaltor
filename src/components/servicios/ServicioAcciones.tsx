'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props { serviceId: string; nombre: string; activo: boolean }

export default function ServicioAcciones({ serviceId, nombre, activo }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggleActivo() {
    const { error } = await supabase.from('repair_services').update({ activo: !activo }).eq('id', serviceId)
    if (error) { toast.error(error.message); return }
    toast.success(activo ? 'Servicio desactivado' : 'Servicio activado')
    router.refresh()
  }

  async function duplicar() {
    setLoading(true)
    // Obtener servicio + items
    const { data: s } = await supabase.from('repair_services').select('*, repair_service_items(*)').eq('id', serviceId).single()
    if (!s) { toast.error('No se pudo duplicar'); setLoading(false); return }
    const { data: nuevo, error } = await supabase.from('repair_services').insert({
      nombre: `${s.nombre} (copia)`, descripcion: s.descripcion, tipo_reparacion: s.tipo_reparacion,
      precio_base: s.precio_base, tiempo_estimado_min: s.tiempo_estimado_min, activo: false,
    }).select('id').single()
    if (error || !nuevo) { toast.error('Error al duplicar'); setLoading(false); return }
    if (s.repair_service_items?.length) {
      await supabase.from('repair_service_items').insert(
        (s.repair_service_items as { nombre: string; cantidad: number; precio_costo: number; product_id: string | null }[]).map(i => ({
          service_id: nuevo.id, nombre: i.nombre, cantidad: i.cantidad, precio_costo: i.precio_costo, product_id: i.product_id,
        }))
      )
    }
    toast.success('Servicio duplicado — edítalo para activarlo')
    router.push(`/servicios/${nuevo.id}/editar`)
    router.refresh()
    setLoading(false)
  }

  async function eliminar() {
    setLoading(true)
    const { error } = await supabase.from('repair_services').delete().eq('id', serviceId)
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Servicio eliminado')
    router.push('/servicios')
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={toggleActivo}>
        {activo ? '⏸ Desactivar' : '▶ Activar'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={duplicar} disabled={loading}>
        📋 Duplicar
      </Button>
      <Button type="button" variant="outline" size="sm"
        onClick={() => setShowConfirm(true)}
        className="text-red-600 border-red-200 hover:bg-red-50">
        🗑️
      </Button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Eliminar servicio</h3>
            <p className="text-sm text-gray-600 mb-4">¿Eliminar <strong>{nombre}</strong>? Esta acción es permanente.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={eliminar} disabled={loading}>
                {loading ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
