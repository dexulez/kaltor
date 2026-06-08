'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { comprimirArchivos } from '@/lib/imageCompress'
import { RepairStatus } from '@/types'

interface Props {
  otId: string
  estadoActual: RepairStatus
}

export default function AgregarFotosOT({ otId, estadoActual }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function subir(files: FileList | null) {
    if (!files || files.length === 0) return
    setLoading(true)

    try {
      const comprimidas = await comprimirArchivos(Array.from(files), 500)
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      let exitosas = 0
      for (const foto of comprimidas) {
        const ext = foto.name.split('.').pop() ?? 'jpg'
        const path = `${otId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
        const { error: upErr } = await supabase.storage.from('ot-fotos').upload(path, foto, { upsert: true })
        if (upErr) continue
        const { data: pub } = supabase.storage.from('ot-fotos').getPublicUrl(path)

        const { error: insErr } = await supabase.from('repair_status_history').insert({
          repair_order_id: otId,
          estado_anterior: estadoActual,
          estado_nuevo: estadoActual,
          comentario: 'Foto agregada al estado actual',
          foto_url: pub.publicUrl,
          usuario_id: currentUser?.id ?? null,
        })
        if (!insErr) exitosas++
      }

      if (exitosas > 0) {
        toast.success(`${exitosas} foto${exitosas > 1 ? 's' : ''} agregada${exitosas > 1 ? 's' : ''} — el cliente ya puede verla${exitosas > 1 ? 's' : ''} en su seguimiento`)
        router.refresh()
      } else {
        toast.error('No se pudo subir ninguna foto')
      }
    } catch {
      toast.error('Error al subir las fotos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <input ref={camRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
        onChange={e => { subir(e.target.files); e.target.value = '' }} />
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { subir(e.target.files); e.target.value = '' }} />
      <button
        type="button" disabled={loading}
        onClick={() => camRef.current?.click()}
        className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? '⏳' : '📷'} {loading ? 'Subiendo...' : 'Tomar foto'}
      </button>
      <button
        type="button" disabled={loading}
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
      >
        🖼️ Galería
      </button>
    </div>
  )
}
