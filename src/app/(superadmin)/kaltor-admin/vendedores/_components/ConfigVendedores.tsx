'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ConfigVendedores({ topeInicial }: { topeInicial: number }) {
  const router = useRouter()
  const [tope, setTope] = useState(String(topeInicial))
  const [busy, setBusy] = useState(false)

  async function guardar() {
    const valor = Number(tope)
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      toast.error('Ingresa un porcentaje entre 0 y 100')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/superadmin/vendedores-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tope_descuento_pct: valor }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success('Tope de descuento actualizado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Tope global de descuento</p>
        <p className="text-xs text-gray-500">Máximo % que cualquier vendedor puede ofrecer en sus links de invitación.</p>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <input
          type="number" min="0" max="100" step="1"
          value={tope}
          onChange={e => setTope(e.target.value)}
          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
        />
        <span className="text-sm text-gray-500">%</span>
        <button
          onClick={guardar}
          disabled={busy}
          className="bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {busy ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
