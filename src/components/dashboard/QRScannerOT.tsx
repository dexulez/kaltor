'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import QRScanner from '@/components/shared/QRScanner'

export default function QRScannerOT() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleScan = useCallback((value: string) => {
    setError(null)

    // Intentar parsear como URL completa (https://dominio/reparaciones/UUID)
    let otId: string | null = null
    try {
      const url = new URL(value)
      const match = url.pathname.match(/\/reparaciones\/([^/]+)/)
      if (match) otId = match[1]
    } catch {
      // No es URL completa, intentar como path directo
      const match = value.match(/\/reparaciones\/([^/]+)/)
      if (match) otId = match[1]
    }

    if (otId) {
      setOpen(false)
      router.push(`/reparaciones/${otId}`)
    } else {
      setError('QR no corresponde a una OT del sistema')
      // Reintentar: mantener escáner abierto
    }
  }, [router])

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null) }}
        className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 text-sm px-3 py-2 rounded-xl font-medium transition-colors"
      >
        📷 Escanear OT
      </button>

      {open && (
        <>
          <QRScanner
            onScan={handleScan}
            onClose={() => { setOpen(false); setError(null) }}
            hint="Escanea el QR de la etiqueta térmica"
          />
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
              {error}
            </div>
          )}
        </>
      )}
    </>
  )
}
