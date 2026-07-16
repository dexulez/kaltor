'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// La pantalla de venta directa maneja su propio refresh tras cobrar y no debe
// recargarse por cambios de fondo en otras tablas (interrumpiría una venta en curso).
const RUTAS_EXCLUIDAS = ['/caja/venta-directa']

export default function RealtimeRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (RUTAS_EXCLUIDAS.includes(pathname)) return

    const supabase = createClient()

    function refresh() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => router.refresh(), 600)
    }

    const channel = supabase
      .channel('global-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repair_orders' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesiones_caja' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repair_items' }, refresh)
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
