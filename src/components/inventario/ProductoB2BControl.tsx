'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  productId: string
  nombre: string
  precioMayorista: number | null
  visibleCompradores: boolean
  disabled?: boolean
}

export default function ProductoB2BControl({ productId, nombre, precioMayorista, visibleCompradores, disabled }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [precio, setPrecio] = useState(String(precioMayorista ?? ''))
  const [visible, setVisible] = useState(visibleCompradores)
  const [guardando, setGuardando] = useState(false)

  async function guardarPrecio() {
    const nuevo = parseInt(precio) || 0
    if (nuevo === (precioMayorista ?? 0)) return
    setGuardando(true)
    const { error } = await supabase.from('products').update({ precio_mayorista: nuevo }).eq('id', productId)
    setGuardando(false)
    if (error) { toast.error('Error al guardar precio mayorista'); return }
    router.refresh()
  }

  async function toggleVisible() {
    const nuevoValor = !visible
    if (nuevoValor && (parseInt(precio) || 0) <= 0) {
      toast.warning(`"${nombre}" se mostrará en el catálogo B2B con precio $0 — defínele un precio mayorista`)
    }
    setVisible(nuevoValor)
    setGuardando(true)
    const { error } = await supabase.from('products').update({ visible_compradores: nuevoValor }).eq('id', productId)
    setGuardando(false)
    if (error) { toast.error('Error al actualizar'); setVisible(!nuevoValor); return }
    toast.success(nuevoValor ? `"${nombre}" agregado al catálogo B2B` : `"${nombre}" quitado del catálogo B2B`)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-xs">$</span>
        <input
          type="number" min={0}
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          onBlur={guardarPrecio}
          disabled={disabled || guardando}
          placeholder="0"
          className="w-20 border rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
        />
      </div>
      <button
        type="button"
        onClick={toggleVisible}
        disabled={disabled || guardando}
        title={visible ? 'Visible en el catálogo B2B' : 'No aparece en el catálogo B2B'}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-40 ${visible ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${visible ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  )
}
