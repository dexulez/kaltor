'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutos

const RUTAS_EXCLUIDAS = ['/caja/venta-directa']

export default function InactivityRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // No aplicar en rutas excluidas ni si ya estamos en dashboard
    if (RUTAS_EXCLUIDAS.includes(pathname) || pathname === '/dashboard') return

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        router.push('/dashboard')
      }, TIMEOUT_MS)
    }

    const eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    eventos.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      eventos.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [pathname, router])

  return null
}
