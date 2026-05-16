'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

export const TIPOS_EQUIPO = [
  { value: 'smartphone',   label: '📱 Smartphone / Celular' },
  { value: 'tablet',       label: '📟 Tablet' },
  { value: 'laptop',       label: '💻 Laptop / Notebook' },
  { value: 'smartwatch',   label: '⌚ Smartwatch' },
  { value: 'auriculares',  label: '🎧 Auriculares' },
  { value: 'parlante',     label: '🔊 Parlante / Bocina' },
  { value: 'consola',      label: '🎮 Consola de videojuegos' },
  { value: 'tv',           label: '📺 TV / Televisor' },
  { value: 'mando_tv',     label: '📡 Mando de TV / Control' },
  { value: 'camara',       label: '📷 Cámara' },
  { value: 'impresora',    label: '🖨️ Impresora' },
  { value: 'accesorio',    label: '🔌 Accesorio' },
  { value: 'otro',         label: '🔧 Otro' },
]

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function TipoEquipoSelector({ value, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const isCustom = value !== '' && !TIPOS_EQUIPO.find(t => t.value === value)

  function handleSelect(v: string) {
    if (v === 'otro') {
      setCustomOpen(true)
      onChange('otro')
    } else {
      setCustomOpen(false)
      onChange(v)
    }
  }

  function handleCustom(v: string) {
    setCustom(v)
    onChange(v)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {TIPOS_EQUIPO.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleSelect(t.value)}
            className={`px-2.5 py-2 rounded-xl border text-xs font-medium text-left transition-colors ${
              value === t.value || (t.value === 'otro' && (customOpen || isCustom))
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {(customOpen || isCustom) && (
        <Input
          value={isCustom ? value : custom}
          onChange={e => handleCustom(e.target.value)}
          placeholder="Ej: Dron, Monitor, Router..."
          autoFocus={customOpen && !isCustom}
          className="mt-1"
        />
      )}
    </div>
  )
}
