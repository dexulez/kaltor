'use client'

import { useState, type ReactNode } from 'react'

export default function ToggleSection({
  title, subtitle, children, defaultOpen = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [abierto, setAbierto] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        className="w-full bg-gray-50 border-b px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-xs font-medium text-blue-600 shrink-0 ml-3">
          {abierto ? '▲ Ocultar' : '▼ Mostrar'}
        </span>
      </button>
      {abierto && <div className="p-4">{children}</div>}
    </div>
  )
}
