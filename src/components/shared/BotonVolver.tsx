'use client'

import { useRouter } from 'next/navigation'

interface Props {
  label?: string
  className?: string
}

// Vuelve a la pantalla realmente anterior (historial del navegador), en vez de
// un destino fijo que ignora desde dónde se entró a esta página.
export default function BotonVolver({ label = '← Volver', className }: Props) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={className ?? 'text-sm text-blue-600 hover:underline'}
    >
      {label}
    </button>
  )
}
