'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { useTransition } from 'react'

export default function ClientesBuscador({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    startTransition(() => {
      if (value) {
        router.push(`${pathname}?q=${encodeURIComponent(value)}`)
      } else {
        router.push(pathname)
      }
    })
  }

  return (
    <Input
      placeholder="Buscar por nombre, teléfono, RUT o email..."
      defaultValue={defaultValue}
      onChange={handleSearch}
      className="max-w-md"
    />
  )
}
