'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RepairStatus } from '@/types'

export const ESTADO_LABELS: Record<RepairStatus, string> = {
  recibido:           'Recibido',
  en_diagnostico:     'En diagnóstico',
  presupuestado:      'Presupuestado',
  aprobado:           'Aprobado',
  rechazado:          'Rechazado',
  esperando_repuesto: 'Esperando repuesto',
  en_reparacion:      'En reparación',
  listo:              'Listo',
  entregado:          'Entregado',
  en_garantia:        'En garantía',
  cancelado:          'Cancelado',
}

// Todos los estados disponibles excepto el actual
const TODOS_ESTADOS: RepairStatus[] = [
  'recibido', 'en_diagnostico', 'presupuestado', 'aprobado',
  'rechazado', 'esperando_repuesto', 'en_reparacion',
  'listo', 'entregado', 'en_garantia', 'cancelado',
]

export default function CambiarEstadoOT({ otId, estadoActual }: { otId: string; estadoActual: RepairStatus }) {
  const router = useRouter()
  const supabase = createClient()
  const [nuevoEstado, setNuevoEstado] = useState<RepairStatus | ''>('')
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)

  const opciones = TODOS_ESTADOS.filter(e => e !== estadoActual)

  async function handleCambio() {
    if (!nuevoEstado) return
    setLoading(true)

    const { error } = await supabase
      .from('repair_orders')
      .update({ estado: nuevoEstado })
      .eq('id', otId)

    if (error) {
      toast.error('Error al cambiar estado')
      setLoading(false)
      return
    }

    await supabase.from('repair_status_history').insert({
      repair_order_id: otId,
      estado_anterior: estadoActual,
      estado_nuevo: nuevoEstado,
      comentario: comentario || null,
    })

    toast.success(`Estado cambiado a: ${ESTADO_LABELS[nuevoEstado]}`)
    setNuevoEstado('')
    setComentario('')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2 min-w-[240px]">
      <Select value={nuevoEstado} onValueChange={v => setNuevoEstado(v as RepairStatus)}>
        <SelectTrigger>
          <span className="truncate text-sm text-left text-gray-700">
            {nuevoEstado ? ESTADO_LABELS[nuevoEstado] : 'Cambiar estado...'}
          </span>
        </SelectTrigger>
        <SelectContent>
          {opciones.map(s => (
            <SelectItem key={s} value={s}>{ESTADO_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {nuevoEstado && (
        <>
          <Textarea
            placeholder="Comentario (opcional)..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            rows={2}
          />
          <Button
            onClick={handleCambio}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Guardando...' : 'Confirmar cambio'}
          </Button>
        </>
      )}
    </div>
  )
}
