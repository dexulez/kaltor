'use client'

import { useRef, useState, useEffect } from 'react'

export default function MultiSelectDropdown({ label, opciones, seleccion, onChange }: {
  label: string
  opciones: { value: string; label: string }[]
  seleccion: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle(valor: string) {
    const next = new Set(seleccion)
    if (next.has(valor)) next.delete(valor)
    else next.add(valor)
    onChange(next)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          seleccion.size > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300'
        }`}
      >
        {label}{seleccion.size > 0 ? ` (${seleccion.size})` : ''}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-56 max-h-72 overflow-y-auto py-1.5">
          {opciones.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">Sin opciones</p>
          ) : opciones.map(op => (
            <label key={op.value} className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={seleccion.has(op.value)} onChange={() => toggle(op.value)} className="w-3.5 h-3.5 accent-blue-600 shrink-0" />
              <span className="truncate">{op.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
