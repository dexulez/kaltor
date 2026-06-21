'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { comprimirImagen } from '@/lib/imageCompress'

interface Props {
  tabla: 'pagos_previsionales' | 'declaraciones_f29' | 'obligaciones_tributarias'
  registroId: string
  urlActual?: string | null
}

export default function SubirComprobanteBtn({ tabla, registroId, urlActual }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function subir(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const comprimido = await comprimirImagen(file, 500)
      const formData = new FormData()
      formData.append('tabla', tabla)
      formData.append('registro_id', registroId)
      formData.append('archivo', comprimido)

      const res = await fetch('/api/contabilidad/upload-comprobante', { method: 'POST', body: formData })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) { toast.error(data.error ?? 'Error al subir el comprobante'); return }
      toast.success('Comprobante adjuntado')
      router.refresh()
    } catch {
      toast.error('Error de conexión al subir el archivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {urlActual && (
        <a href={urlActual} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
          📎 Ver
        </a>
      )}
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={e => { subir(e.target.files); e.target.value = '' }} />
      <button
        type="button" disabled={loading}
        onClick={() => fileRef.current?.click()}
        className="text-xs border border-blue-300 text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? '⏳' : urlActual ? '🔄 Reemplazar' : '📎 Adjuntar'}
      </button>
    </div>
  )
}
