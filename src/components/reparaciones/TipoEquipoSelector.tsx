'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { EquipmentType } from '@/types'

export { TIPOS_EQUIPO } from '@/lib/tipoEquipo'
export { labelTipoEquipo } from '@/lib/tipoEquipo'

interface Props {
  value: string
  onChange: (v: string) => void
  tipos: Pick<EquipmentType, 'value' | 'label' | 'icon'>[]
}

export default function TipoEquipoSelector({ value, onChange, tipos }: Props) {
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const isCustom = value !== '' && !tipos.find(t => t.value === value)

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
      <div className="grid grid-cols-2 gap-1.5">
        {tipos.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleSelect(t.value)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors leading-tight ${
              value === t.value || (t.value === 'otro' && (customOpen || isCustom))
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 active:bg-gray-100'
            }`}
          >
            <span className="text-base shrink-0">{t.icon}</span>
            <span>{t.label}</span>
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
      <p className="text-xs text-gray-400">
        ¿Falta un tipo? Agrégalo desde Configuración → Tipos de equipo.
      </p>
    </div>
  )
}
