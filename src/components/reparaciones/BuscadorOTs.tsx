'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export default function BuscadorOTs({ q }: { q: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) params.set('q', value)
    else params.delete('q')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="relative max-w-sm">
      <input
        type="text"
        defaultValue={q}
        placeholder="🔍 Buscar por nombre, teléfono, N° OT, equipo o marca..."
        onChange={e => handleChange(e.target.value)}
        className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
      {q && (
        <button onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
      )}
    </div>
  )
}
