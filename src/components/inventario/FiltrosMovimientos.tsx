'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

const TIPO_OPTIONS = [
  { value: '',                label: 'Todos los tipos' },
  { value: 'entrada',         label: '📦 Recepción OC' },
  { value: 'salida',          label: '🛒 Venta' },
  { value: 'carga_inicial',   label: '📥 Carga inicial' },
  { value: 'ajuste',          label: '✏️ Ajuste' },
  { value: 'ajuste_positivo', label: '➕ Ajuste (+)' },
  { value: 'ajuste_negativo', label: '➖ Ajuste (−)' },
]

interface Props {
  desde: string
  hasta: string
  tipo: string
  q: string
}

export default function FiltrosMovimientos({ desde, hasta, tipo, q }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium block">Desde</label>
          <input type="date" defaultValue={desde}
            onChange={e => navigate({ desde: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium block">Hasta</label>
          <input type="date" defaultValue={hasta}
            onChange={e => navigate({ hasta: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium block">Tipo</label>
          <select defaultValue={tipo}
            onChange={e => navigate({ tipo: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {TIPO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48 space-y-1">
          <label className="text-xs text-gray-500 font-medium block">Buscar producto / usuario</label>
          <input type="text" defaultValue={q}
            placeholder="Nombre, SKU, razón..."
            onChange={e => {
              const val = e.target.value
              const t = setTimeout(() => navigate({ q: val }), 500)
              return () => clearTimeout(t)
            }}
            className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
    </div>
  )
}
