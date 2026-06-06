'use client'

import { useEffect } from 'react'

export default function NoScrollNumbers() {
  useEffect(() => {
    function handler(e: WheelEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT' &&
          (e.target as HTMLInputElement).type === 'number') {
        (e.target as HTMLInputElement).blur()
      }
    }
    document.addEventListener('wheel', handler, { passive: true })
    return () => document.removeEventListener('wheel', handler)
  }, [])

  return null
}
