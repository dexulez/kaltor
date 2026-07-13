'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface Props {
  otId: string
  historialId: string
}

export default function EliminarComentarioOT({ otId, historialId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function eliminar() {
    if (!confirm('¿Borrar este comentario? El cliente ya no lo verá en su seguimiento.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reparaciones/${otId}/foto`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historialId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Comentario eliminado')
      router.refresh()
    } catch {
      toast.error('Error al borrar el comentario')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={eliminar}
      disabled={loading}
      title="Borrar comentario"
      className="text-gray-300 hover:text-red-500 shrink-0 disabled:opacity-50 transition-colors"
    >
      <X size={14} />
    </button>
  )
}
