'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function BorrarServicioBtn({ id, nombre }: { id: string; nombre: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function eliminar() {
    setLoading(true)
    const { error } = await supabase.from('repair_services').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); setLoading(false); return }
    toast.success(`Servicio "${nombre}" eliminado`)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex gap-1.5 items-center">
        <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
        <button onClick={eliminar} disabled={loading}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg font-medium disabled:opacity-50">
          {loading ? '...' : 'Sí'}
        </button>
        <button onClick={() => setConfirm(false)}
          className="text-xs border px-2 py-1 rounded-lg text-gray-600 hover:bg-gray-100">
          No
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setConfirm(true)}
      className="text-xs border border-red-200 text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg font-medium transition-colors">
      🗑 Borrar
    </button>
  )
}
