'use client'

import { useState, useRef } from 'react'
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
  presupuestado:      'Presupuestando',
  aprobado:           'Aceptado',
  rechazado:          'Rechazado',
  esperando_repuesto: 'Esperando repuesto',
  en_reparacion:      'En reparación',
  listo:              'Listo',
  para_entrega:       'Para entrega',
  entregado:          'Entregado',
  en_garantia:        'En garantía',
  cancelado:          'Cancelado',
}

// Flujo lógico de estados
const TODOS_ESTADOS: RepairStatus[] = [
  'recibido', 'en_diagnostico',
  'presupuestado', 'aprobado', 'rechazado',
  'esperando_repuesto', 'en_reparacion',
  'listo', 'para_entrega', 'entregado',
  'en_garantia', 'cancelado',
]

// Descripción del estado para el técnico
export const ESTADO_DESC: Partial<Record<RepairStatus, string>> = {
  presupuestado:  'Enviando presupuesto al cliente',
  aprobado:       'Cliente aceptó el presupuesto',
  rechazado:      'Cliente rechazó el presupuesto',
  listo:          'Reparación terminada (marcar resultado abajo)',
  para_entrega:   'Equipo listo para retiro y pago',
  en_garantia:    'El equipo regresó por garantía',
}

export default function CambiarEstadoOT({ otId, estadoActual }: { otId: string; estadoActual: RepairStatus }) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nuevoEstado, setNuevoEstado] = useState<RepairStatus | ''>('')
  const [comentario, setComentario] = useState('')
  const [resultado, setResultado] = useState<'exitosa' | 'no_exitosa' | ''>('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const opciones = TODOS_ESTADOS.filter(e => e !== estadoActual)

  async function comprimirFoto(file: File): Promise<File> {
    const MAX = 500 * 1024 // 0.5 MB
    if (file.size <= MAX) return file
    const img = new Image()
    const srcUrl = URL.createObjectURL(file)
    await new Promise<void>(res => { img.onload = () => res(); img.src = srcUrl })
    URL.revokeObjectURL(srcUrl)
    let { width, height } = img
    const MAX_DIM = 1600
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
      else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
    }
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    for (let q = 0.85; q >= 0.1; q -= 0.1) {
      const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', q))
      if (blob.size <= MAX) return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
    }
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.1))
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const comprimida = await comprimirFoto(f)
    setFoto(comprimida)
    setFotoPreview(URL.createObjectURL(comprimida))
  }

  function quitarFoto() {
    setFoto(null)
    setFotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function subirFoto(): Promise<string | null> {
    if (!foto) return null
    const ext = foto.name.split('.').pop() ?? 'jpg'
    const path = `${otId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('ot-fotos').upload(path, foto, { upsert: true })
    if (error) { toast.error('Error al subir foto'); return null }
    const { data } = supabase.storage.from('ot-fotos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleCambio() {
    if (!nuevoEstado) return
    if (nuevoEstado === 'listo' && !resultado) {
      toast.error('Indica si la reparación fue exitosa o sin reparación')
      return
    }
    setLoading(true)

    const fotoUrl = await subirFoto()

    // Actualizar estado + resultado si aplica
    const updatePayload: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === 'listo' && resultado) updatePayload.resultado = resultado

    const { error } = await supabase
      .from('repair_orders')
      .update(updatePayload)
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
      foto_url: fotoUrl,
    })

    toast.success(`Estado: ${ESTADO_LABELS[nuevoEstado]}`)
    setNuevoEstado('')
    setComentario('')
    setResultado('')
    quitarFoto()
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2 min-w-[240px]">
      <Select value={nuevoEstado} onValueChange={v => { setNuevoEstado(v as RepairStatus); setResultado('') }}>
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
          {/* Sub-opción para "Listo" */}
          {nuevoEstado === 'listo' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResultado('exitosa')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${resultado === 'exitosa' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`}
              >
                ✅ Reparado
              </button>
              <button
                type="button"
                onClick={() => setResultado('no_exitosa')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${resultado === 'no_exitosa' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'}`}
              >
                🔧 Sin reparación
              </button>
            </div>
          )}

          <Textarea
            placeholder="Comentario (opcional)..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            rows={2}
          />

          {/* Foto adjunta */}
          <div>
            {fotoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoPreview} alt="Foto" className="w-full h-32 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={quitarFoto}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
                >✕</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-500">
                <span>📷</span>
                <span>Adjuntar foto (opcional)</span>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
              </label>
            )}
          </div>

          <Button onClick={handleCambio} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Guardando...' : 'Confirmar cambio'}
          </Button>
        </>
      )}
    </div>
  )
}
