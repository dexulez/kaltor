'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function CancelarEliminarOCBtn({ ordenId, numero, estado }: { ordenId: string; numero: string; estado: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function cancelar() {
    if (!window.confirm(`¿Cancelar la orden ${numero}? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    const { error } = await supabase.from('purchase_orders').update({ estado: 'cancelada' }).eq('id', ordenId)
    if (error) { toast.error('Error al cancelar: ' + error.message); setLoading(false); return }
    toast.success(`${numero} cancelada`)
    router.refresh()
    setLoading(false)
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar definitivamente la orden ${numero}? Se eliminarán todos sus ítems.`)) return
    setLoading(true)
    await supabase.from('purchase_order_items').delete().eq('purchase_order_id', ordenId)
    const { error } = await supabase.from('purchase_orders').delete().eq('id', ordenId)
    if (error) { toast.error('Error al eliminar: ' + error.message); setLoading(false); return }
    toast.success(`${numero} eliminada`)
    router.push('/compras')
  }

  const puedeEliminar = estado === 'cancelada'
  const puedeCancelar = !['cancelada', 'recibida_completa'].includes(estado)

  if (!puedeCancelar && !puedeEliminar) return null

  return (
    <div className="flex gap-2">
      {puedeCancelar && (
        <Button variant="outline" onClick={cancelar} disabled={loading}
          className="text-orange-600 border-orange-300 hover:bg-orange-50">
          🚫 Cancelar OC
        </Button>
      )}
      {puedeEliminar && (
        <Button variant="outline" onClick={eliminar} disabled={loading}
          className="text-red-600 border-red-300 hover:bg-red-50">
          🗑️ Eliminar
        </Button>
      )}
    </div>
  )
}
