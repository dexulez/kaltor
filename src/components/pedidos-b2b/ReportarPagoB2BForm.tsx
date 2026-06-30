'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { comprimirArchivos } from '@/lib/imageCompress'

interface Props {
  pedidoIds: string[]
  totalAPagar: number
  etiqueta?: string
  onSuccess?: () => void
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

export default function ReportarPagoB2BForm({ pedidoIds, totalAPagar, etiqueta = 'Pagar', onSuccess }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [metodo, setMetodo] = useState('transferencia')
  const [nota, setNota] = useState('')
  const [archivos, setArchivos] = useState<File[]>([])

  async function agregarArchivos(files: FileList | null) {
    if (!files || files.length === 0) return
    const comprimidos = await comprimirArchivos(Array.from(files), 500)
    setArchivos(prev => [...prev, ...comprimidos])
  }

  function quitarArchivo(idx: number) {
    setArchivos(prev => prev.filter((_, i) => i !== idx))
  }

  async function enviar() {
    if (archivos.length === 0) { toast.error('Adjunta al menos un comprobante de pago'); return }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('pedido_ids', JSON.stringify(pedidoIds))
      formData.append('metodo_pago', metodo)
      if (nota.trim()) formData.append('nota', nota.trim())
      archivos.forEach(f => formData.append('archivos', f))

      const res = await fetch('/api/pedidos-b2b/reportar-pago', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al reportar el pago'); return }
      toast.success('Pago reportado. El vendedor lo revisará pronto.')
      setOpen(false)
      setNota('')
      setArchivos([])
      router.refresh()
      onSuccess?.()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
        💳 {etiqueta} {formatCLP(totalAPagar)}
      </Button>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800 text-sm">Reportar pago de {formatCLP(totalAPagar)}</p>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Método de pago</label>
        <select
          value={metodo} onChange={e => setMetodo(e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="transferencia">🏦 Transferencia</option>
          <option value="efectivo">💵 Efectivo</option>
          <option value="debito">💳 Débito</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Nota (opcional)</label>
        <input
          type="text" placeholder="Ej: Transferencia ref. 12345"
          value={nota} onChange={e => setNota(e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Comprobante de pago</label>
        <input
          type="file" accept="image/*,application/pdf" multiple
          onChange={e => { agregarArchivos(e.target.files); e.target.value = '' }}
          className="mt-1 w-full text-xs"
        />
        {archivos.length > 0 && (
          <ul className="mt-1 space-y-1">
            {archivos.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => quitarArchivo(i)} className="text-red-500 hover:text-red-700 ml-2">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={enviar} disabled={loading || archivos.length === 0} className="flex-1 bg-orange-500 hover:bg-orange-600">
          {loading ? 'Enviando...' : 'Enviar comprobante'}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
      </div>
    </div>
  )
}
