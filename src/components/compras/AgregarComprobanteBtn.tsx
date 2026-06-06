'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { comprimirArchivos } from '@/lib/imageCompress'

interface Props {
  ordenId: string
}

export default function AgregarComprobanteBtn({ ordenId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  async function subir(files: FileList | null) {
    if (!files || files.length === 0) return
    setLoading(true)

    try {
      // Comprimir imágenes a máx 500 KB
      const comprimidos = await comprimirArchivos(Array.from(files), 500)

      const formData = new FormData()
      formData.append('orden_id', ordenId)
      comprimidos.forEach(f => formData.append('archivos', f))

      const res = await fetch('/api/compras/upload-comprobante', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json() as { ok?: boolean; urls?: string[]; errores?: string[]; error?: string }

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Error al subir los archivos')
        return
      }

      const n = data.urls?.length ?? 0
      toast.success(`${n} comprobante${n !== 1 ? 's' : ''} adjuntado${n !== 1 ? 's' : ''} correctamente`)
      if (data.errores?.length) toast.warning(`${data.errores.length} archivo(s) no se pudieron subir`)
      router.refresh()
    } catch {
      toast.error('Error de conexión al subir archivos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <input ref={camRef} type="file" accept="image/*" capture="environment"
        multiple className="hidden"
        onChange={e => { subir(e.target.files); e.target.value = '' }} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf"
        multiple className="hidden"
        onChange={e => { subir(e.target.files); e.target.value = '' }} />
      <button
        type="button" disabled={loading}
        onClick={() => camRef.current?.click()}
        className="flex items-center gap-1.5 text-xs border border-blue-300 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? '⏳' : '📷'} {loading ? 'Subiendo...' : 'Foto'}
      </button>
      <button
        type="button" disabled={loading}
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-xs border border-blue-300 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
      >
        🖼️ Galería / PDF
      </button>
    </div>
  )
}
