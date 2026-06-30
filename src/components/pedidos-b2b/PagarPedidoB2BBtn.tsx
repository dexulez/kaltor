'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { comprimirArchivos } from '@/lib/imageCompress'

interface Pago {
  id: string
  monto: number
  metodo_pago: string
  fecha: string
  nota: string | null
  comprobante_url: string | null
}

interface Props {
  pedidoId: string
  total: number
  montoPagado: number
  pagos: Pago[]
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

export default function PagarPedidoB2BBtn({ pedidoId, total, montoPagado, pagos }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('transferencia')
  const [nota, setNota] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const saldoPendiente = total - montoPagado

  async function elegirArchivo(files: FileList | null) {
    if (!files || files.length === 0) return
    const [comprimido] = await comprimirArchivos(Array.from(files).slice(0, 1), 500)
    setArchivo(comprimido)
  }

  async function pagar() {
    const montoNum = parseInt(monto)
    if (!montoNum || montoNum <= 0) { toast.error('Ingresa un monto válido'); return }
    if (montoNum > saldoPendiente) { toast.error(`El monto no puede superar el saldo pendiente ${formatCLP(saldoPendiente)}`); return }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('monto', String(montoNum))
      formData.append('metodoPago', metodo)
      if (nota.trim()) formData.append('nota', nota.trim())
      if (archivo) formData.append('archivo', archivo)

      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/abonar`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al registrar el pago'); return }
      toast.success(`Pago de ${formatCLP(montoNum)} registrado`)
      setOpen(false)
      setMonto('')
      setNota('')
      setArchivo(null)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-orange-800 text-sm">Pagos de este pedido</p>
          <div className="flex gap-4 mt-1 text-xs">
            <span className="text-gray-600">Total: <strong>{formatCLP(total)}</strong></span>
            <span className="text-green-700">Pagado: <strong>{formatCLP(montoPagado)}</strong></span>
            <span className="text-red-600 font-bold">Pendiente: <strong>{formatCLP(Math.max(0, saldoPendiente))}</strong></span>
          </div>
        </div>
        <span className="text-2xl">💳</span>
      </div>

      {pagos.length > 0 && (
        <div className="px-4 py-2 divide-y border-b">
          {pagos.map(p => (
            <div key={p.id} className="py-1.5 text-xs flex items-center justify-between text-gray-600">
              <span>
                {p.fecha} · {p.metodo_pago}{p.nota ? ` · ${p.nota}` : ''}
                {p.comprobante_url && (
                  <a href={p.comprobante_url} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline">
                    📎 Ver comprobante
                  </a>
                )}
              </span>
              <span className="font-medium text-gray-800">{formatCLP(p.monto)}</span>
            </div>
          ))}
        </div>
      )}

      {saldoPendiente > 0 && (
        !open ? (
          <div className="px-4 py-3">
            <Button onClick={() => setOpen(true)} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              💳 Abonar a este pedido
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Monto a pagar</label>
                <input
                  type="number" min={1} max={saldoPendiente}
                  placeholder={String(saldoPendiente)}
                  value={monto} onChange={e => setMonto(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-400 mt-0.5">Máx: {formatCLP(saldoPendiente)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Método de pago</label>
                <select
                  value={metodo} onChange={e => setMetodo(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">🏦 Transferencia</option>
                  <option value="debito">💳 Débito</option>
                </select>
              </div>
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
              <label className="text-xs font-medium text-gray-600">Comprobante de pago (opcional)</label>
              <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { elegirArchivo(e.target.files); e.target.value = '' }} />
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => { elegirArchivo(e.target.files); e.target.value = '' }} />
              <div className="mt-1 flex items-center gap-2">
                <button type="button" onClick={() => camRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                  📷 Foto
                </button>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                  🖼️ Galería / PDF
                </button>
                {archivo && (
                  <span className="text-xs text-green-700 flex items-center gap-1">
                    ✓ {archivo.name}
                    <button type="button" onClick={() => setArchivo(null)} className="text-gray-400 hover:text-red-600">✕</button>
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={pagar} disabled={loading || !monto} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {loading ? 'Registrando...' : `Registrar pago${monto ? ` de ${formatCLP(parseInt(monto) || 0)}` : ''}`}
              </Button>
              <Button variant="outline" onClick={() => { setOpen(false); setMonto(''); setNota(''); setArchivo(null) }} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
