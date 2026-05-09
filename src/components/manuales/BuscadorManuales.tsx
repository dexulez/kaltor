'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BuscadorManuales({ defaultQ }: { defaultQ?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [valor, setValor] = useState(defaultQ ?? '')

  useEffect(() => { setValor(defaultQ ?? '') }, [defaultQ])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (valor.trim()) params.set('q', valor.trim())
      else params.delete('q')
      router.push(`${pathname}?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <input
      type="search"
      value={valor}
      onChange={e => setValor(e.target.value)}
      placeholder="Buscar por equipo, falla, título..."
      className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-yellow-50 focus:bg-white transition-colors"
      autoComplete="off"
    />
  )
}
