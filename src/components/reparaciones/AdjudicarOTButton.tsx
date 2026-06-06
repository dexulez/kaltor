'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function AdjudicarOTButton({ otId, userId }: { otId: string; userId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function adjudicar() {
    setLoading(true)
    const { error } = await supabase
      .from('repair_orders')
      .update({ tecnico_id: userId })
      .eq('id', otId)
    if (error) { toast.error('Error al adjudicarse la OT'); setLoading(false); return }
    toast.success('OT adjudicada — ahora aparece en tus reparaciones')
    // Recarga completa para que móvil/PWA actualice correctamente
    setTimeout(() => { window.location.reload() }, 700)
  }

  return (
    <Button
      size="sm"
      onClick={adjudicar}
      disabled={loading}
      className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 h-7"
    >
      {loading ? '...' : '⚡ Adjudicarme'}
    </Button>
  )
}
