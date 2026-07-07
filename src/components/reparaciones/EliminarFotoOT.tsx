'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface Props {
  otId: string
  historialId: string
}

export default function EliminarFotoOT({ otId, historialId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function eliminar() {
    if (!confirm('¿Borrar esta foto? El cliente ya no la verá en su seguimiento.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reparaciones/${otId}/foto`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historialId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Foto eliminada')
      router.refresh()
    } catch {
      toast.error('Error al borrar la foto')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={eliminar}
      disabled={loading}
      title="Borrar foto"
      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow disabled:opacity-50 transition-colors"
    >
      <X size={12} />
    </button>
  )
}
