'use client'

import { ICONOS_EQUIPO } from '@/lib/tipoEquipo'

interface Props {
  value: string
  onChange: (icon: string) => void
}

export default function IconoPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ICONOS_EQUIPO.map(icon => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          className={`h-9 rounded-lg border text-lg flex items-center justify-center transition-colors ${
            value === icon
              ? 'bg-blue-600 border-blue-600'
              : 'bg-gray-50 border-gray-200 hover:border-blue-400'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
