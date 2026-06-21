'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function RecordatorioRentaAnual({ year, yaExiste }: { year: number; yaExiste: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  async function agregar() {
    setSaving(true)
    const { error } = await supabase.from('obligaciones_tributarias').insert({
      nombre: `Declaración de Renta (F22) ${year}`,
      monto: 0,
      fecha_vencimiento: `${year}-04-30`,
      recurrencia: 'anual',
      notas: 'Si tienes devolución, el plazo se extiende hasta la primera semana de mayo (depósito según cuándo declares). Ajusta el monto cuando lo sepas.',
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Recordatorio agregado en "Otras obligaciones"')
    router.refresh()
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
      <div>
        <p className="text-sm font-semibold text-indigo-800">📋 Declaración de Renta (F22) — vence el 30 de abril de {year}</p>
        <p className="text-xs text-indigo-600 mt-0.5">
          Con devolución, el plazo se extiende hasta la primera semana de mayo (depósito según cuándo declares: 1-8 abril → 29 abril, 9-23 abril → 15 mayo, 24 abril-8 mayo → 27 mayo).
        </p>
      </div>
      {yaExiste ? (
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium shrink-0">✓ Ya está en tus obligaciones</span>
      ) : (
        <Button size="sm" onClick={agregar} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
          {saving ? 'Agregando...' : '+ Agregar recordatorio'}
        </Button>
      )}
    </div>
  )
}
