'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { comprimirArchivos } from '@/lib/imageCompress'

interface ItemDespacho {
  id: string
  nombre: string
  cantidadConfirmada: number
  precioUnitario: number
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

export default function DespacharPedidoB2BForm({ pedidoId, items }: { pedidoId: string; items: ItemDespacho[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [precios, setPrecios] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map(it => [it.id, String(it.precioUnitario)]))
  )
  const [foto, setFoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const total = useMemo(() =>
    items.reduce((s, it) => s + it.cantidadConfirmada * (Number(precios[it.id]) || 0), 0)
  , [items, precios])

  async function despachar() {
    if (!window.confirm(`¿Confirmar despacho de este pedido por ${formatCLP(total)}?`)) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('precios', JSON.stringify(
        Object.fromEntries(Object.entries(precios).map(([id, v]) => [id, Number(v) || 0]))
      ))
      if (foto) {
        const [comprimida] = await comprimirArchivos([foto], 500)
        formData.append('foto', comprimida)
      }
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/despachar`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al confirmar despacho'); return }
      toast.success('Despacho confirmado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5">
        <h2 className="font-semibold text-blue-800 text-sm">🚚 Preparar despacho — corrige el precio final si hace falta</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Producto</th>
              <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Cantidad</th>
              <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Precio final</th>
              <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(it => (
              <tr key={it.id}>
                <td className="px-3 py-2 font-medium text-gray-900">{it.nombre}</td>
                <td className="px-3 py-2 text-right">{it.cantidadConfirmada}</td>
                <td className="px-3 py-2 text-right">
                  <Input type="number" min={0} className="w-28 text-right inline-block"
                    value={precios[it.id] ?? ''} onChange={e => setPrecios(prev => ({ ...prev, [it.id]: e.target.value }))} />
                </td>
                <td className="px-3 py-2 text-right font-medium">{formatCLP(it.cantidadConfirmada * (Number(precios[it.id]) || 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t-2">
              <td className="px-3 py-2" colSpan={3}>Total final</td>
              <td className="px-3 py-2 text-right text-blue-700">{formatCLP(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-4 py-3 border-t space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Foto de comprobante de despacho (opcional)</label>
          <input ref={fileRef} type="file" accept="image/*"
            onChange={e => setFoto(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-gray-600" />
        </div>
        <Button onClick={despachar} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Confirmando...' : '🚚 Confirmar despacho'}
        </Button>
      </div>
    </div>
  )
}
