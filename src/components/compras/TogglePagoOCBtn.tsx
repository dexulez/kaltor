'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  ordenId: string
  pagado: boolean
}

export default function TogglePagoOCBtn({ ordenId, pagado }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [editando, setEditando] = useState(false)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  async function marcarPagado() {
    setSaving(true)
    const { error } = await supabase.from('purchase_orders').update({
      pagado: true,
      fecha_pago: new Date(`${fecha}T12:00:00`).toISOString(),
    }).eq('id', ordenId)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Marcado como pagado')
    setEditando(false)
    router.refresh()
  }

  async function revertir() {
    setSaving(true)
    const { error } = await supabase.from('purchase_orders').update({ pagado: false, fecha_pago: null }).eq('id', ordenId)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Revertido a pendiente de pago')
    router.refresh()
  }

  if (pagado) {
    return (
      <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={revertir} disabled={saving}>
        Revertir a pendiente
      </Button>
    )
  }

  if (editando) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="h-8 w-36 text-xs" />
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={marcarPagado} disabled={saving}>
          {saving ? 'Guardando...' : 'Confirmar'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditando(false)} disabled={saving}>Cancelar</Button>
      </div>
    )
  }

  return (
    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setEditando(true)}>
      💳 Marcar como pagado
    </Button>
  )
}
