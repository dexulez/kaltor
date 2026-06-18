'use client'

import { useEffect } from 'react'

// Tipos de <input> donde forzar mayúsculas no tiene sentido o rompería el campo.
const TIPOS_EXCLUIDOS = new Set([
  'password', 'email', 'number', 'date', 'time', 'datetime-local',
  'month', 'week', 'file', 'checkbox', 'radio', 'color', 'range', 'hidden', 'url',
])

function esElegible(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return false
  if (el.readOnly || el.disabled) return false
  if (el.dataset.noMayusculas !== undefined) return false
  if (el instanceof HTMLInputElement && TIPOS_EXCLUIDOS.has(el.type)) return false
  return true
}

function handleInput(e: Event) {
  const el = e.target
  if (!esElegible(el)) return
  const mayus = el.value.toUpperCase()
  if (mayus === el.value) return
  const inicio = el.selectionStart
  const fin = el.selectionEnd
  el.value = mayus
  if (inicio !== null) el.setSelectionRange(inicio, fin ?? inicio)
}

/**
 * Intercepta el evento nativo "input" (fase de captura, antes de que React
 * procese el cambio) y convierte el valor a mayúsculas en el propio elemento
 * del DOM. Como corre antes de que React lea `e.target.value`, queda
 * aplicado para cualquier campo controlado de cualquier formulario del
 * sistema, sin tener que modificar cada componente uno por uno.
 *
 * Excluye campos de contraseña, email, numéricos, de fecha/hora y archivos,
 * además de cualquier input/textarea marcado con `data-no-mayusculas`.
 */
export default function MayusculasListener({ activo }: { activo: boolean }) {
  useEffect(() => {
    if (!activo) return
    document.addEventListener('input', handleInput, true)
    return () => document.removeEventListener('input', handleInput, true)
  }, [activo])

  return null
}
