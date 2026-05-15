'use client'

import { useEffect, useRef } from 'react'

const PREFIX = 'trdraft_'

/** Guarda `data` en sessionStorage cada vez que cambia (debounced 800ms) */
export function useAutoSaveDraft<T>(key: string, data: T) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try { sessionStorage.setItem(PREFIX + key, JSON.stringify(data)) } catch {}
    }, 800)
    return () => clearTimeout(timer.current)
  })
}

export function loadDraft<T>(key: string): T | null {
  try {
    const s = sessionStorage.getItem(PREFIX + key)
    return s ? (JSON.parse(s) as T) : null
  } catch { return null }
}

export function clearDraft(key: string) {
  try { sessionStorage.removeItem(PREFIX + key) } catch {}
}
