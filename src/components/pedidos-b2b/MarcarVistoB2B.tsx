'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MarcarVistoB2B() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/pedidos-b2b/marcar-visto', { method: 'POST' })
      .then(() => router.refresh())
      .catch(() => {})
  }, [router])

  return null
}
