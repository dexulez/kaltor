'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'

const TZ = 'America/Santiago'

export default function AbrirCajaInline({ returnUrl, puedeAbrir = true }: { returnUrl?: string; puedeAbrir?: boolean }) {
  const supabase = createClient()
  const [fondo, setFondo] = useState('0')
  const [saving, setSaving] = useState(false)

  async function abrir() {
    setSaving(true)
    const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
    const { error } = await supabase.from('sesiones_caja').insert({
      fecha: hoy,
      estado: 'abierta',
      efectivo_apertura: parseInt(fondo) || 0,
      apertura_at: new Date().toISOString(),
    })
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success('Caja abierta — puedes procesar ventas')
    window.location.reload()
  }

  if (!puedeAbrir) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-8 w-full max-w-sm space-y-3 text-center">
          <span className="text-5xl">🔒</span>
          <h2 className="text-xl font-bold text-gray-800">La caja está cerrada</h2>
          <p className="text-sm text-gray-500">No tienes permiso para abrir la caja — pide a un encargado que la abra.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-8 w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <span className="text-5xl">🔒</span>
          <h2 className="text-xl font-bold text-gray-800">La caja está cerrada</h2>
          <p className="text-sm text-gray-500">Abre la caja para poder procesar ventas directas</p>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-gray-700 block">
            Fondo de cambio (efectivo inicial)
          </label>
          <input
            type="number"
            min={0}
            value={fondo}
            onChange={e => setFondo(e.target.value)}
            className="w-full border-2 rounded-xl px-4 py-3 text-lg text-center font-bold focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            placeholder="0"
          />
          {parseInt(fondo) > 0 && (
            <p className="text-sm text-green-700 font-semibold text-center">
              {formatCLP(parseInt(fondo))}
            </p>
          )}
        </div>

        <button
          onClick={abrir}
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-base transition-colors disabled:opacity-50"
        >
          {saving ? 'Abriendo...' : '🔓 Abrir caja y continuar'}
        </button>
      </div>
    </div>
  )
}
