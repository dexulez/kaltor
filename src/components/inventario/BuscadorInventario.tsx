'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import QRScanner from '@/components/shared/QRScanner'

export default function BuscadorInventario({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [valor, setValor] = useState(defaultValue ?? '')
  const [showScanner, setShowScanner] = useState(false)

  // Registra los valores que nosotros mismos pusheamos a la URL,
  // para no resetear el input cuando llegue la respuesta del servidor.
  const inFlightRef = useRef(new Set<string>())

  // Detecta cambios externos en la URL (botón atrás, filtros de categoría, etc.)
  // pero ignora los cambios que nosotros mismos generamos con router.push.
  const urlQ = searchParams.get('q') ?? ''
  useEffect(() => {
    if (inFlightRef.current.has(urlQ)) {
      inFlightRef.current.delete(urlQ)
    } else {
      setValor(urlQ)
    }
  }, [urlQ])

  // Debounce: espera 350ms desde la última tecla antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = valor.trim()
      const params = new URLSearchParams(searchParams.toString())
      if (trimmed) {
        params.set('q', trimmed)
      } else {
        params.delete('q')
      }
      params.delete('page')
      inFlightRef.current.add(trimmed)
      router.push(`${pathname}?${params.toString()}`)
    }, 350)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  function handleScan(codigo: string) {
    setShowScanner(false)
    setValor(codigo.trim())
  }

  return (
    <>
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          hint="Apunta al código de barras del producto"
        />
      )}

      <div className="flex items-center gap-1.5">
        <input
          type="search"
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="Buscar producto, SKU, código..."
          className="border rounded-lg px-3 py-2 text-sm w-56 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-yellow-50 focus:bg-white transition-colors"
          autoComplete="off"
        />
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 transition-colors shrink-0"
          title="Escanear código de barras"
          type="button"
        >
          <span className="text-lg">📷</span>
        </button>
      </div>
    </>
  )
}
