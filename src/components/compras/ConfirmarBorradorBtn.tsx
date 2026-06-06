'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type Estado = 'idle' | 'seleccionando' | 'confirmado'

export default function ConfirmarBorradorBtn({
  ordenId, numero, supplierPhone,
}: {
  ordenId: string
  numero: string
  supplierPhone?: string | null
}) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [estado, setEstado] = useState<Estado>('idle')
  const [linkPedido, setLinkPedido] = useState('')
  const [metodoPago, setMetodoPago] = useState('credito')
  const [plazoDias, setPlazoDias] = useState(30)

  async function confirmar() {
    setLoading(true)
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        notas: null,
        estado: 'enviada',
        metodo_pago: metodoPago,
        plazo_pago_dias: plazoDias,
      })
      .eq('id', ordenId)
    if (error) { toast.error('Error al confirmar pedido'); setLoading(false); return }

    const baseUrl = window.location.origin
    const link = `${baseUrl}/pedido/${ordenId}`
    setLinkPedido(link)
    setEstado('confirmado')
    setLoading(false)
    router.refresh()
  }

  async function cancelarPedido() {
    if (!window.confirm(`¿Cancelar la solicitud ${numero}? Se eliminará permanentemente.`)) return
    setLoading(true)
    await supabase.from('purchase_order_items').delete().eq('purchase_order_id', ordenId)
    const { error } = await supabase.from('purchase_orders').delete().eq('id', ordenId)
    if (error) { toast.error('Error al cancelar'); setLoading(false); return }
    toast.success(`Solicitud ${numero} cancelada`)
    router.refresh()
  }

  function enviarWhatsApp() {
    const phone = (supplierPhone ?? '').replace(/\D/g, '')
    const msg = `Hola, te compartimos la solicitud de pedido *${numero}*.\n\nPor favor revisa los productos y confirma disponibilidad y precios en el siguiente enlace:\n\n${linkPedido}\n\n¡Gracias!`
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkPedido)
    toast.success('Link copiado al portapapeles')
  }

  if (estado === 'confirmado') {
    return (
      <div className="flex flex-col gap-2 items-end min-w-[280px]">
        <p className="text-xs text-green-700 font-medium">✓ Enviada al proveedor. Comparte el link:</p>
        <div className="flex gap-1.5">
          <button
            onClick={enviarWhatsApp}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            📲 WhatsApp
          </button>
          <button
            onClick={copiarLink}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border"
          >
            📋 Copiar link
          </button>
        </div>
      </div>
    )
  }

  if (estado === 'seleccionando') {
    return (
      <div className="flex flex-col gap-2 min-w-[300px] bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-blue-800">Configurar condiciones de pago</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Método de pago</label>
            <select
              value={metodoPago}
              onChange={e => setMetodoPago(e.target.value)}
              className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="credito">💳 Crédito</option>
              <option value="contado">💵 Contado</option>
              <option value="transferencia">🏦 Transferencia</option>
            </select>
          </div>
          {metodoPago === 'credito' && (
            <div>
              <label className="text-xs text-gray-500">Plazo (días)</label>
              <input
                type="number" min={1} max={180}
                value={plazoDias}
                onChange={e => setPlazoDias(Number(e.target.value))}
                className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={confirmar} disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs">
            {loading ? 'Enviando...' : '📤 Enviar al proveedor'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEstado('idle')} disabled={loading}
            className="text-xs text-gray-500">
            Atrás
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => setEstado('seleccionando')} disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-xs">
        📤 Enviar al proveedor
      </Button>
      <Button size="sm" onClick={cancelarPedido} disabled={loading} variant="outline"
        className="text-red-600 border-red-300 hover:bg-red-50 text-xs">
        🗑️ Cancelar
      </Button>
    </div>
  )
}
