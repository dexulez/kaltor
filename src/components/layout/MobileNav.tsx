'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MODULOS, tieneAccesoModulo } from '@/lib/modulos'
import { UserProfile } from '@/types'

const SHORT_LABEL: Record<string, string> = {
  dashboard:    'Inicio',
  clientes:     'Clientes',
  reparaciones: 'Taller',
  inventario:   'Stock',
  caja:         'Caja',
  compras:      'Compras',
  usuarios:     'Usuarios',
  informes:     'Informes',
  configuracion:'Config',
}

export default function MobileNav({ user }: { user: UserProfile | null }) {
  const pathname = usePathname()
  const roleName = user?.roles?.nombre ?? ''

  const visible = MODULOS.filter(m =>
    tieneAccesoModulo(m.key, roleName, user?.permisos_modulos ?? null)
  ).slice(0, 5)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-blue-900 border-t border-blue-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {visible.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-center transition-colors',
                isActive ? 'text-white bg-blue-700' : 'text-blue-300 hover:text-white'
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight">
                {SHORT_LABEL[item.key] ?? item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
