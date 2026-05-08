'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BuscadorInventario({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [valor, setValor] = useState(defaultValue ?? '')

  useEffect(() => {
    setValor(defaultValue ?? '')
  }, [defaultValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (valor.trim()) {
        params.set('q', valor.trim())
      } else {
        params.delete('q')
      }
      // Reinicia a página 1 si existe paginación
      params.delete('page')
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
      placeholder="Buscar producto, SKU, código..."
      className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-yellow-50 focus:bg-white transition-colors"
      autoComplete="off"
    />
  )
}
