'use client'

import { ICONOS_EQUIPO_GRUPOS } from '@/lib/tipoEquipo'

interface Props {
  value: string
  onChange: (icon: string) => void
}

export default function IconoPicker({ value, onChange }: Props) {
  return (
    <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
      {ICONOS_EQUIPO_GRUPOS.map(grupo => (
        <div key={grupo.categoria}>
          <p className="text-[11px] font-medium text-gray-400 mb-1">{grupo.categoria}</p>
          <div className="grid grid-cols-8 gap-1.5">
            {grupo.iconos.map(icon => (
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
        </div>
      ))}
    </div>
  )
}
