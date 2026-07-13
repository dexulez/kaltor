'use client'

import { useEffect, useState } from 'react'
import type { EquipmentType } from '@/types'

export function useTiposEquipo() {
  const [tipos, setTipos] = useState<EquipmentType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true
    fetch('/api/equipment-types')
      .then(res => res.json())
      .then(data => { if (activo) setTipos(data.tipos ?? []) })
      .finally(() => { if (activo) setLoading(false) })
    return () => { activo = false }
  }, [])

  return { tipos, setTipos, loading }
}
