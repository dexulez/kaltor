'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'

interface Props {
  pagoId: string
  ordenId: string
  supplierId: string
  monto: number
  montoPagadoActual: number
  saldoDeudorProveedor: number
}

export default function EliminarAbonoBtn({
  pagoId, ordenId, supplierId, monto, montoPagadoActual, saldoDeudorProveedor,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [razon, setRazon] = useState('')
  const [loading, setLoading] = useState(false)

  async function eliminar() {
    if (!razon.trim()) { toast.error('Debes indicar la razón de la eliminación'); return }
    setLoading(true)
    try {
      // Guardar la razón en la nota antes de borrar (opcional: log en notas de la OC)
      const { error: errDel } = await supabase
        .from('purchase_order_payments')
        .delete()
        .eq('id', pagoId)
      if (errDel) throw errDel

      // Revertir monto_pagado en la OC
      const nuevoMonto = Math.max(0, montoPagadoActual - monto)
      await supabase.from('purchase_orders')
        .update({ monto_pagado: nuevoMonto })
        .eq('id', ordenId)

      // Revertir saldo_deudor del proveedor
      await supabase.from('suppliers')
        .update({ saldo_deudor: saldoDeudorProveedor + monto })
        .eq('id', supplierId)

      toast.success(`Abono de ${formatCLP(monto)} eliminado. Razón: ${razon}`)
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar el abono')
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-red-400 hover:text-red-600 text-xs px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
        title="Eliminar abono"
      >
        🗑️
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        autoFocus
        placeholder="Razón de eliminación..."
        value={razon}
        onChange={e => setRazon(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        className="border border-red-300 rounded px-2 py-0.5 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-red-400"
      />
      <button
        onClick={eliminar}
        disabled={loading || !razon.trim()}
        className="text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-2 py-0.5 rounded transition-colors"
      >
        {loading ? '...' : 'Confirmar'}
      </button>
      <button
        onClick={() => { setOpen(false); setRazon('') }}
        className="text-xs text-gray-400 hover:text-gray-600 px-1"
      >
        Cancelar
      </button>
    </div>
  )
}
