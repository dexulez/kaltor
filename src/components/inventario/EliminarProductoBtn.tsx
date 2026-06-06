'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function EliminarProductoBtn({ productId, nombre }: { productId: string; nombre: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function eliminar() {
    if (!window.confirm(`¿Eliminar "${nombre}"? Esta acción lo desactivará del inventario.`)) return
    setLoading(true)
    const { error } = await supabase.from('products').update({ activo: false }).eq('id', productId)
    if (error) { toast.error('Error al eliminar: ' + error.message); setLoading(false); return }
    toast.success(`"${nombre}" eliminado`)
    router.refresh()
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={eliminar}
      disabled={loading}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
    >
      {loading ? '...' : 'Eliminar'}
    </Button>
  )
}
