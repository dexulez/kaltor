'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function EnviarPedidoWhatsAppBtn({ ordenId, numero, supplierPhone, estado }: {
  ordenId: string
  numero: string
  supplierPhone?: string | null
  estado?: string | null
}) {
  const [copiado, setCopiado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()
  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.kaltorpos.com'}/pedido/${ordenId}`

  async function enviarWhatsApp() {
    setEnviando(true)

    // Marcar como enviada vía API si aún está pendiente
    if (estado === 'pendiente') {
      try {
        const res = await fetch(`/api/compras/orden/${ordenId}/marcar-enviada`, { method: 'POST' })
        const data = await res.json() as { ok?: boolean; skipped?: boolean; error?: string }
        if (!res.ok) {
          toast.error(data.error ?? 'No se pudo actualizar el estado')
        } else if (!data.skipped) {
          toast.success('OC marcada como enviada al proveedor')
          router.refresh()
        }
      } catch {
        toast.error('Error de conexión al actualizar estado')
      }
    }

    const phone = (supplierPhone ?? '').replace(/\D/g, '')
    const msg = `Hola, te compartimos la solicitud de pedido *${numero}*.\n\nPor favor revisa los productos y confirma disponibilidad en el siguiente enlace:\n\n${link}\n\n¡Gracias!`
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setEnviando(false)
  }

  function copiarLink() {
    navigator.clipboard.writeText(link)
    toast.success('Link copiado')
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={enviarWhatsApp}
        disabled={enviando}
        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
      >
        📲 {enviando ? 'Enviando...' : 'Enviar a proveedor'}
      </button>
      <button
        onClick={copiarLink}
        className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm px-3 py-2 rounded-lg font-medium border border-gray-300 transition-colors"
        title="Copiar link del pedido"
      >
        {copiado ? '✓ Copiado' : '🔗 Link'}
      </button>
    </div>
  )
}
