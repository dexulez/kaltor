'use client'

import { useState } from 'react'

export default function CopiarCuenta({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // fallback para navegadores sin clipboard API
      const el = document.createElement('textarea')
      el.value = texto
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return (
    <button
      onClick={copiar}
      className="w-full text-xs text-center font-medium py-1.5 rounded-lg transition-colors"
      style={{ color: copiado ? '#16a34a' : '#2563eb' }}
    >
      {copiado ? '✓ Datos copiados al portapapeles' : '📋 Copiar datos de esta cuenta'}
    </button>
  )
}
