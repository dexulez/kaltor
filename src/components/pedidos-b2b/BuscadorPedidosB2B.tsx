'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function BuscadorPedidosB2B({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [valor, setValor] = useState(defaultValue ?? '')

  const inFlightRef = useRef(new Set<string>())

  const urlQ = searchParams.get('q') ?? ''
  useEffect(() => {
    if (inFlightRef.current.has(urlQ)) {
      inFlightRef.current.delete(urlQ)
    } else {
      setValor(urlQ)
    }
  }, [urlQ])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = valor.trim()
      const params = new URLSearchParams(searchParams.toString())
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      inFlightRef.current.add(trimmed)
      router.push(`${pathname}?${params.toString()}`)
    }, 350)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <input
      type="search"
      value={valor}
      onChange={e => setValor(e.target.value)}
      placeholder="🔍 Buscar por N° de pedido o comprador..."
      className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
      autoComplete="off"
    />
  )
}
